# Case Study 04 — Runtime Local e Resiliência

## Problema

Um sistema pessoal de automação perde valor se depender integralmente de uma única interface, conexão ou provedor externo.

## Solução

O JOS mantém componentes locais para execução, observabilidade e fallback, integrados a serviços externos quando necessário.

## Componentes demonstráveis

- Runtime local de agentes.
- Modelo local para tarefas compatíveis.
- Watchdog e processos always-on.
- Proxy e conectividade segura entre dispositivos.
- API local para orquestração.
- Telemetria e health checks.

## Estratégia de resiliência

1. Preferir caminho principal com melhor qualidade.
2. Detectar indisponibilidade ou timeout.
3. Aplicar retry classificado quando seguro.
4. Utilizar fallback compatível com o contrato.
5. Persistir checkpoint e evidência.
6. Não declarar sucesso sem validar o destino.

## Limites atuais

Escalabilidade horizontal e certificação empírica de agentes ainda estão em evolução. O sistema privilegia evidência real de produção em vez de elevar scores artificialmente.
