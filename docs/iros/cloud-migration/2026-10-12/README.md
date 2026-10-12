# Migração cloud-first — agentes escolares (12/10/2026)

Nota pública e sanitizada. O registro completo (evidências, identificadores e rollback) fica no próprio IROS, execução `5fb4582b`. Esta página não contém credenciais, endpoints, dados de alunos nem detalhes de superfície de segurança.

## Princípios aplicados

- O IROS continua sendo o control plane: toda leitura passou por política → registro de ações → executor → verificação → auditoria.
- O notebook usado em aula fica **só para aulas e trabalho**. O control plane deixou de agendar tarefas nele.
- Escrita em sistema escolar (notas, faltas, conteúdo) só com aprovação explícita e releitura no destino. Nesta etapa nenhuma escrita foi feita.
- Execução na nuvem primeiro; outros computadores entram só como apoio autorizado.

## Estado por instituição

| | CEJA | Mater / São Conrado | Legacy Barra |
|---|---|---|---|
| Leitura real na nuvem | Verificada (Drive e Classroom) | Verificada (Drive e base de conhecimento) | Verificada (Drive) |
| Sistema escolar | Classroom: monitor na nuvem a cada 2 h | Unimestre: só por automação local, sem executor na nuvem | ActiveSoft: sem executor na nuvem; Classroom em outra conta |
| Escrita | Não executada | Não executada | Não executada |
| Certificação | Pendente | Pendente | Pendente |
| Próximo passo | Alimentar o ciclo de avaliações para o radar diário ter dados | Rota semiautomática: o IROS gera o arquivo de notas e o professor importa com a tela de conferência do Unimestre | Conectar a conta institucional e obter acesso oficial ao ActiveSoft |

Legenda usada no registro interno: VERIFICADO, RELATADO, PENDENTE, BLOQUEADO.

## O que mudou nesta etapa

- Snapshot versionado da configuração de agentes e workflows antes de qualquer mudança.
- Rotinas da nuvem que mandavam tarefas para o notebook de aula foram pausadas, com rollback registrado.
- Registros de credenciais conciliados com o cofre, sem leitura de valores.
- Relatório de auditoria operacional enviado ao fluxo oficial, aguardando aprovação humana.

## O que ainda não está pronto

- Runtime de workflows na nuvem (n8n em staging) sem auditoria direta nesta etapa.
- Nenhum agente escolar certificado.
- Unimestre e ActiveSoft sem executor na nuvem.
