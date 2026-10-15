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

> Privacidade: contagens apenas. Nomes de alunos e notas individuais ficam só no IROS (Supabase, acesso controlado), nunca no repositório.

| Turma | Confirmado p/ lançar AV2 | Validar grafia | Pendente identificação | Ausente da lista ativa | Sem nota comprovada |
|------|:-:|:-:|:-:|:-:|:-:|
| 2101 | **10** | 2 | 0 | 1 | 1 |
| 2201 | **9** | 0 | 0 | 0 | 1 |
| 2301 | **8** | 0 | 1 | 0 | 2 |
| **Total** | **27** | 2 | 1 | 1 | 4 |

- Total de registros AV2 no IROS ≈ **31** na 1ª consolidação, coerente com o histórico (“~31 registros, ≥1 identificação pendente”). Ver Parte 2 para o estado atual (30 confirmados após segunda chamada).
- Nenhuma nota foi inventada; médias parciais e o componente AV1 lido do ActiveSoft **não** foram tratados como AV2.

---

## 4. PENDENTE (bloqueios/dependências para a escrita — Fase F)

1. **Estrutura de avaliação do 3º bim inexistente** (`existe_avaliacao=false`): lançar a AV2 exige **gerar a composição AV1/AV2/EO** nas turmas antes do primeiro `salvar_nota`. Isso cria também os campos AV1 e EO (afeta além da AV2), portanto não é um write isolado de 1 registro — precisa de decisão explícita.
2. **Teste controlado de 1 registro** + releitura de persistência (exigência da missão) ainda não executado.
3. **Aprovação humana / Policy Engine** para `grades.write` (regra ativa `requires_approval`).
4. **Registros fora do lote** até resolução: 2 com grafia de nome divergente; 1 com identificação pendente (nota ditada sem nome único); e alunos presentes no cadastro mas ausentes da lista ativa lida no ActiveSoft. Detalhe nominativo apenas no IROS.

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

**Próximo passo proposto:** lançar a AV2 de **um** aluno inequívoco como teste, reler e confirmar no ActiveSoft; só então liberar os lotes por turma.

---

# PARTE 2 — Mecanismo de escrita mapeado + estado final (2026-10-15)

> Privacidade: este documento não contém nomes de alunos nem notas individuais. Esses dados ficam apenas no IROS (Supabase, com controle de acesso) — nunca no repositório.

## Rota real da grade de notas
A digitação AV1/AV2/EO é a rota SPA `/portal_eb_professor/planilha_notas_faltas/{turma}/{disciplina}`, servida pelo módulo **`/api/v1/avaliacao_nota`**:
- **Carregar:** `GET /api/v1/avaliacao_nota?periodo=8&curso=3&serie=<serie>&turma=<t>&fase_nota=<f>&disciplina=11&situacao=A`
- **Validar célula:** `POST /api/v1/avaliacao_nota/validar/?fase_nota=&turma=&aluno=&disciplina=` · body `{"valor":<n>,"campo":"NC02"}`
- **Salvar AV2:** `PATCH /api/v1/avaliacao_nota/?fase_nota=&turma=&aluno=&disciplina=` · body `{"NC02":<n>}`
- **Confirmar turma:** `POST /api/v1/avaliacao_nota/confirmar_notas_turma/`

**AV2 = `NC02`** (fórmula 238: NC01=AV1≤8, NC02=AV2≤10, NC03=EO≤2; média=(AV1+AV2+EO)/2). Fases 3º bim: 2101→508, 2201→521, 2301→534 (curso=3; serie 15/16/17).

## Bloqueio (do ActiveSoft, não de permissão do usuário)
A sessão por login server-side (mesmo professor, credenciais do Vault) recebe **HTTP 403 em todo o módulo `avaliacao_nota`**, apesar de `portal_professor/turmas`=200 e do `recuperar_notas` antigo=200. Finalizar unidade não destrava; a SPA não envia header além de `X-CSRFToken`. Logo, a grade nova exige a **sessão do navegador do professor**. Superfícies de escrita alternativas indisponíveis agora: Desktop Commander **0% de cota**; conector do iMac **somente leitura**; navegador cloud do Railway fora de alcance (e a missão proíbe reinstalar adaptador no contêiner gráfico estável).

## Preparado para disparo imediato
- `jair_os.iros_as_av2_write(cookie, turma, fase, serie, aluno, valor, dry_run)` — roda **com o cookie da sessão do navegador**; dry-run lê a grade + `validar` (sem salvar); execução faz `validar` → `PATCH {"NC02":valor}` → releitura de verificação, com auditoria antes/depois. Escopo travado (AV2/NC02, fases {508,521,534}, disciplina 11, turmas Legacy, valor 0–10).
- Lote de lançamento e matriz canônica persistidos no IROS (`school_ops`).

## Estado canônico atual (contagens, sem PII)
- **Confirmados e lançáveis: 30** (1ª série 11, 2ª 10, 3ª 9) — todos com matrícula ativa e id de aluno resolvido.
- **Fora do lote: 6** — 2 grafias a confirmar, 1 identificação pendente, 2 ausentes da lista ativa, 1 sem nota comprovada.
- **Concorrência:** os registros canônicos foram atualizados em 2026-10-14 22:53 por **outro canal** (sessão ChatGPT-work), que adicionou notas de **segunda chamada** e criou a chave `..._segunda_chamada_20261014`. Coordenar para não lançar em duplicidade.

## Para concluir (1 insumo)
Capturar **1 requisição `avaliacao_nota`** da sessão do navegador do professor (DevTools → Network → Copy as cURL) e fornecê-la ao IROS. Com esse cookie, o `iros_as_av2_write` lança os 30 confirmados (teste de 1 registro → verificação → lotes por turma), mantendo as pendências fora. **Nenhuma nota foi escrita no ActiveSoft até aqui.**
