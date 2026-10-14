# IROS Cloud — ActiveSoft / Legacy School — AV2 do 3º BIMESTRE 2026 (Física)

**Data:** 2026-10-14 · **Executor:** IROS Cloud-first (Supabase `zfbcvoaxgswjsgbavobp`) · **Escola:** Legacy School Barra da Tijuca
**Disciplina:** Física · **Avaliação:** AV2 · **Nomenclatura oficial:** 3º BIMESTRE (período letivo 2026 = `periodo_id` 8)

> Resumo executivo: a **autenticação e a leitura** no ActiveSoft foram **homologadas pela nuvem**, sem expor credenciais. A **matriz canônica** AV2 × ActiveSoft está consolidada. O **campo da AV2 foi confirmado** no ActiveSoft. A **escrita de notas NÃO foi executada** — está preparada e bloqueada por um pré-requisito técnico real e pela exigência (da própria missão) de teste controlado de 1 registro + aprovação. Nada foi declarado homologado por simulação.

---

## 1. EXECUTADO E CONFIRMADO (com comprovação no destino ActiveSoft)

### Autenticação real (Fase C)
- Login server-to-server em `https://siga01.activesoft.com.br/` usando credenciais do **Supabase Vault** (`iros_legacy_activesoft_login/senha/institution`). Segredos **nunca** passaram pelo chat, pelo Action Bus nem por logs.
- Sessão docente estabelecida e validada por chamada autenticada (`/api/v1/fields/select/periodo/` → 200; `/api/v1/portal_professor/turmas/` → 200).
- Identidade/instituição/turmas conferem com o cadastro interno `legacy_barra`.

### Turmas e avaliações lidas (Fases C/D)
| Turma | Série | turma_id (AS) | disciplina | id_diario | alunos (AS) | fase 3º bim |
|------|-------|---------------|-----------|-----------|-------------|-------------|
| 2101 | 1ª série EM | 102 | FÍSICA (11) | 1268 | 16 | **508** |
| 2201 | 2ª série EM | 103 | FÍSICA (11) | 1348 | 10 | **521** |
| 2301 | 3ª série EM | 110 | FÍSICA (11) | 1428 | 11 | **534** |

### Correspondência AV2 confirmada (exigência da missão)
Fonte: `/api/v1/fields/select/formula_nota` (fórmula **238 — "3 COMPS - GERAL"**), usada pelas três séries:
- **NC01 = "AV1"** (máx **8,00**)
- **NC02 = "AV2"** (máx **10,00**) ← **campo-alvo da AV2/V2**
- **NC03 = "EO"** (máx **2,00**)
- Média do bimestre = **(AV1 + AV2 + EO) / 2**, nota máxima 10,00.

### Estado atual da AV2 no ActiveSoft
- **Nenhum aluno** com nota **confirmada** no 3º bimestre (`st_nota_confirmada=false` em 100% das linhas).
- `existe_avaliacao=false` no 3º bim → a estrutura de avaliações (AV1/AV2/EO) ainda **não foi gerada** nas três turmas.
- Conclusão: **a AV2 ainda NÃO está lançada** no ActiveSoft (coerente com o IROS: `publicacao_activesoft = nao_lancada`).

### Governança registrada no IROS
- Matriz canônica persistida: `school_ops / legacy_av2_fisica_3b_2026_reconciliation_matrix` (35 linhas).
- Mapeamento de campo: `school_ops / legacy_activesoft_av2_field_mapping`.
- Auditoria: `jair_os.audit_events` (`iros.activesoft.session.login`, `iros.activesoft.exec.before/after`, `iros.activesoft.homologation.readpath`).
- Action Registry: `session.status`, `classes.read`, `assessments.read`, `students.read`, `grades.read`, `grades.verify` **habilitados** (read-only, executor server-side). `grades.write` **registrado e DESABILITADO**.
- Policy Engine: regra `legacy_activesoft_grades_write` = **requires_approval** (risco alto), escopo Legacy/AV2/3º bim.

---

## 2. PREPARADO (implementado/testado, sem uso em produção)

- **Executor isolado e reversível** `jair_os.iros_activesoft_exec(operation, args, job)` — somente leitura (`session.status`, `api.read`), com allowlist de rotas `/api/v1/`, bloqueio de verbos/paths de escrita, e auditoria antes/depois. Sessão curta (45 min) guardada no Vault (`iros_activesoft_session_runtime`), renovável.
- **Contrato de escrita AV2** (`legacy.activesoft.grades.write.v1`): escopo restrito a `componente=NC02`, `fase_nota_id ∈ {508,521,534}`, `disciplina_id=11`, `0 ≤ valor ≤ 10`, com **idempotência** por `(turma_id, fase_nota_id, aluno_id, componente)` — **desabilitado**.
- **Verificação pós-escrita** (`grades.verify`) pronta para reler e comparar com a matriz canônica.

---

## 3. Matriz canônica — classificação por turma

| Turma | Confirmado p/ lançar AV2 | Validar grafia | Pendente identificação (fora do lote) | Aluno IROS não achado no AS | Sem nota comprovada no IROS |
|------|:-:|:-:|:-:|:-:|:-:|
| 2101 | **10** | 2 (Laura Brum, Sophie Pélico) | 0 | 1 (Isabela Gomes 7,3) | 1 (Emmanuella) |
| 2201 | **9** | 0 | 0 | 0 | 1 (Pietra) |
| 2301 | **8** | 0 | 1 (Thiago/“Iago ou Rodrigo” 8,2) | 0 | 2 (Ana Clara dos Santos, Isabela Amaral) |
| **Total** | **27** | 2 | 1 | 1 | 4 |

- Total de registros AV2 no IROS = **31** (27 prontos + 2 grafia + 1 pendente id + 1 não-encontrado), coerente com o histórico (“~31 registros, ≥1 identificação pendente”).
- Nenhuma nota foi inventada; médias parciais e `nota_01` do ActiveSoft **não** foram tratadas como AV2.

---

## 4. PENDENTE (bloqueios/dependências para a escrita — Fase F)

1. **Estrutura de avaliação do 3º bim inexistente** (`existe_avaliacao=false`): lançar a AV2 exige **gerar a composição AV1/AV2/EO** nas turmas antes do primeiro `salvar_nota`. Isso cria também os campos AV1 e EO (afeta além da AV2), portanto não é um write isolado de 1 registro — precisa de decisão explícita.
2. **Teste controlado de 1 registro** + releitura de persistência (exigência da missão) ainda não executado.
3. **Aprovação humana / Policy Engine** para `grades.write` (regra ativa `requires_approval`).
4. **4 registros fora do lote** até resolução: grafia de Laura Brum e Sophie Pélico; identificação de Thiago Montedo (nota 8,2 ditada como “Iago ou Rodrigo”); e Isabela Gomes (7,3) presente no cadastro mas ausente da lista ativa lida no ActiveSoft.

## 5. FALHOU
- Nenhuma operação de escrita foi tentada (portanto sem falha de escrita). Desktop Commander do iMac indisponível no mês (cota) — não usado; a execução ocorreu 100% pela nuvem.

---

## 6. Critério final de sucesso — estado
| # | Critério | Estado |
|---|----------|--------|
| 1 | Infra cloud operacional | ✔ leitura homologada pela nuvem |
| 2 | Identidade docente autenticada | ✔ |
| 3 | Turmas e avaliações consultadas | ✔ (2101/2201/2301, fases 508/521/534, AV2=NC02) |
| 4 | Escrita autorizada e auditável | ◻ contrato pronto; **desabilitado** sob aprovação |
| 5 | Notas AV2 lançadas/reconhecidas | ◻ nenhuma lançada ainda (bloqueio técnico + aprovação) |
| 6 | Confirmação no ActiveSoft por lançamento | ◻ pendente de execução |
| 7 | Divergências/pendências identificadas | ✔ (seção 3/4) |
| 8 | Repetível com segurança | ✔ executor + contratos + política |

**Próximo passo proposto:** gerar a estrutura de avaliação do 3º bim em **uma** turma, lançar a AV2 de **um** aluno inequívoco como teste, reler e confirmar no ActiveSoft; só então liberar os lotes por turma (27 confirmados).
