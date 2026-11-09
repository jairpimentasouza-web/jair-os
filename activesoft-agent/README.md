# Agente ActiveSoft — acesso e lançamento de notas

Agente do Jair OS que concentra em um só lugar o **acesso ao ActiveSoft** (login + escolha de unidade) e o **lançamento de notas** a partir das planilhas de notas ditadas.

A grade de notas do portal do professor (`/portal_eb_professor/planilha_notas_faltas/{turma}/{disciplina}/`) recusa sessões puramente programáticas (HTTP 403). Por isso o agente:

1. abre um navegador real (Playwright/Chromium) e faz login como o professor;
2. abre a grade da turma e captura os cabeçalhos e parâmetros que o próprio portal usa;
3. chama a API da grade **de dentro da página**, com a mesma sessão.

## Fluxo

```
planilha .xlsx ──► planilha_para_lote.py ──► lote.json ──► activesoft-agent.mjs lancar
                                                             │  (simulação por padrão)
                                                             ├─ login + unidade
                                                             ├─ abre a grade, descobre a fase do bimestre
                                                             ├─ casa nomes com a grade (nome exato do diário)
                                                             ├─ --aplicar: validar → gravar célula a célula
                                                             └─ relê a grade, confere cada nota e
                                                                checa que AV2/EO/outros alunos não mudaram
```

## Uso

```bash
# 1) Planilha → lote (o lote tem dados de alunos: NUNCA commitar)
python3 -I activesoft-agent/planilha_para_lote.py notas.xlsx \
  --turma-id 2101=<turma_id> --turma-id 2301=<turma_id> \
  --disciplina-id <id> --disciplina "Física" --periodo <periodo> --valor-maximo 8 > lote.json

# 2) Simulação (lê a grade e mostra o plano; não grava nada)
node activesoft-agent/activesoft-agent.mjs lancar --lote lote.json

# 3) Lançamento de fato
node activesoft-agent/activesoft-agent.mjs lancar --lote lote.json --aplicar

# Diagnóstico somente leitura de uma grade (fases, colunas, estrutura)
node activesoft-agent/activesoft-agent.mjs descobrir --turma-id <id> --disciplina-id <id> --bimestre 4
```

Credenciais vêm **só** de variáveis de ambiente, injetadas pelo executor do Jair OS a partir do Supabase Vault:
`ACTIVESOFT_INSTITUICAO`, `ACTIVESOFT_LOGIN`, `ACTIVESOFT_SENHA` e, se houver mais de uma unidade, `ACTIVESOFT_UNIDADE` (regex).

Saída (relatório JSON e capturas de tela) em `./saida-activesoft/`, que fica fora do git.

## Garantias de segurança

| Regra | Como é aplicada |
|---|---|
| Simulação por padrão | Nada é gravado sem `--aplicar`. |
| Não sobrescreve | Célula já preenchida com outro valor é pulada (só grava por cima com `--sobrescrever`). |
| Vínculo duvidoso | Linhas com "Confirmar vínculo"/"Associação inferida" na planilha são puladas (entram só com `--incluir-pendentes`). |
| Nome exato | O nome precisa bater exatamente com um único aluno da grade; se não bater, a turma inteira fica bloqueada. |
| Faixa da nota | Nota fora de `0..valor_maximo` bloqueia a turma. |
| Validação oficial | Cada valor passa pelo `validar/` do ActiveSoft antes do `PATCH`. |
| Releitura | Depois de gravar, a grade é relida: cada nota é conferida e os demais campos/alunos são comparados com o estado anterior. |
| Turma não é fechada | O agente **nunca** chama `confirmar_notas_turma`: a confirmação final continua com o professor. |

## Formato do lote

```json
{
  "versao": 1, "ano": 2026, "bimestre": 4, "avaliacao": "AV1", "campo": "AV1",
  "valor_maximo": 8, "disciplina_id": 0, "periodo": 0,
  "fase_nota": { "2101": 0 },
  "turmas": [
    { "turma": "2101", "turma_id": 0,
      "notas": [ { "nome": "Nome completo como no diário", "nota": 3.6, "vinculo": "confirmado" } ] }
  ]
}
```

`fase_nota` é opcional: sem ela, o agente descobre a fase do bimestre nas respostas da própria grade e para, sem gravar nada, se encontrar zero ou mais de uma candidata.

## Achados da primeira execução real (09/11/2026)

- Depois do login o ActiveSoft move a sessão para um servidor próprio (ex.: `siga01`); o agente segue esse host.
- A fase do bimestre é descoberta pela lista oficial do seletor "Fase de nota" (`/api/v1/fields/select/fase_nota/`).
- **Na Legacy a grade de notas é a LEGADA (ASP)**: ao clicar em CONSULTAR o portal abre um iframe `alunoTurma` em `app2.activesoft.com.br/sistema/LoginDiretoV2.asp`, que repassa para `appNN`. A API moderna `avaliacao_nota` responde 403 mesmo na sessão real do navegador. O agente detecta isso e para sem gravar nada.
- Falta implementar o modo de lançamento pela grade ASP. Ele precisa rodar num computador cujo navegador alcance `app*.activesoft.com.br`; na nuvem do Claude Code o navegador recebe 502 nesses hosts.

## Testes

```bash
node --test activesoft-agent/*.test.mjs
```

Os testes usam dados sintéticos. A API da grade (`GET/PATCH /api/v1/avaliacao_nota/`, `POST .../validar/`) foi mapeada por engenharia reversa do portal em 10/2026. Se o ActiveSoft mudar, rode `descobrir` primeiro: ele mostra a estrutura real sem gravar nada.
