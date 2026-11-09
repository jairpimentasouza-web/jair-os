# Assinaturas da plataforma — decisão de provedor e operação

> Dois fluxos financeiros nunca se misturam: **(1)** alunos pagam professores (módulo
> Financeiro do tenant: `aulas`, `despesas`, `pacotes`) e **(2)** professores pagam o
> ProfGestor (este documento: `organizations.entitlement`, `billingEvents`). Receita da
> plataforma nunca é calculada a partir de dados dos tenants.

## Planos (hipóteses comerciais — `functions/src/plans.js`)

| Plano | Mensal | Observação |
|---|---:|---|
| Essencial | R$ 29,90 | limite proposto de 25 alunos ativos (a validar; **não imposto** pelas regras ainda) |
| Profissional | R$ 49,90 | sem limite de alunos |
| Fundador | R$ 39,90 por 12 meses | preço do Profissional com cupom de R$ 10 por 12 ciclos; depois R$ 49,90; máximo de 100 assinantes |
| Equipe | R$ 119,90 | `sellable: false` — o servidor recusa venda até existir multiusuário |

Teste gratuito: 14 dias a partir da criação da organização, sem cartão, imposto pelas regras.
Se o professor assinar durante o teste, o Stripe recebe `trial_end` com os dias restantes.

## Decisão: Stripe como provedor principal; Mercado Pago como alternativa implementada

| Critério | Stripe | Mercado Pago |
|---|---|---|
| Pix recorrente (Pix Automático) em assinaturas | **Sim**, desde 22/04/2026 ([changelog oficial](https://docs.stripe.com/changelog/dahlia/2026-04-22/pix-recurring-payments-support)) | Não confirmado na documentação de assinaturas consultada |
| Cartão recorrente | Sim | Sim (`preapproval`) |
| Portal do assinante (trocar plano, cartão, cancelar) | Nativo (Billing Portal) | Não nativo |
| Cupons, troca de plano com proporcionalidade, retentativas | Nativos | Limitados |
| Ambiente de teste com relógio simulado (renovação/falha determinísticas) | Sim (test clocks) | Sandbox de assinaturas limitado |
| Verificação de webhook no SDK oficial | `constructEvent` com tolerância de tempo | `WebhookSignatureValidator` (SDK v3) |
| Familiaridade do público | Menor | **Maior** entre professores brasileiros |

Escolha: **Stripe**, porque cobre nativamente todos os requisitos do prompt (teste, cancelamento,
recuperação, troca de plano, cupons, portal) e permite executar a matriz de testes em modo de
teste com relógio simulado. O adaptador Mercado Pago está implementado e testado para o caso de
o proprietário preferir o MP ou não conseguir conta Stripe.

**Taxas: não verificadas em fonte oficial nesta sessão.** Fontes de terceiros divergem (ex.:
3,99% + R$ 0,39 por cartão nacional no Stripe; Pix entre 0% e 1,19%; no MP, crédito entre
~3% e ~5% conforme prazo de recebimento). Confirmar em `stripe.com/br/pricing` e na página de
tarifas do Mercado Pago antes de fixar preços. Também confirmar a exigência de CNPJ/CPF para a conta.

## Garantias implementadas (testadas no emulador)

- O cliente envia só `planId`; preço, cupom, organização e teste restante são decididos no servidor.
- Webhooks: assinatura verificada com o SDK oficial e janela de 300 s contra replay; o payload
  apenas aciona o processamento — o estado é **relido na API do provedor**.
- Idempotência: `billingEvents/{provider}_{eventId}` gravado na mesma transação da mudança.
- Ordem: cada leitura carrega `version`; leitura mais antiga que a aplicada é descartada.
- Assinatura antiga cancelada não derruba a nova (troca de plano/reativação).
- Preço fora do catálogo (ou valor divergente no MP) → `blocked`, nunca acesso.
- Conta original (`billingExempt`) imune a eventos de cobrança.
- `sk_live_`/`rk_live_` recusadas sem `BILLING_LIVE_APPROVED=true`.
- Reconciliação diária (04:17, São Paulo) relê todas as assinaturas e corrige divergências.

## Ativação (em homologação primeiro; nada disso foi feito)

1. Conta Stripe em **modo de teste**; criar produtos/preços Essencial (R$ 29,90) e Profissional (R$ 49,90) e o cupom Fundador (R$ 10,00, `duration=repeating`, 12 meses); habilitar Pix e cartão; configurar o Billing Portal.
2. Segredos no Secret Manager do projeto de homologação:
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY --project staging
   ```
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project staging
   ```
   Parâmetros não secretos: `STRIPE_PRICE_ESSENCIAL`, `STRIPE_PRICE_PROFISSIONAL`, `STRIPE_COUPON_FUNDADOR`, `APP_URL`.
3. `firebase deploy --only functions:profgestor-v5 --project staging`; registrar o endpoint `stripeWebhook` no Stripe com os eventos listados em `STRIPE_EVENTS`.
4. Executar a matriz com test clocks (novo, renovação, falha, cancelamento, reativação, troca, estorno).
5. **Cobrança real só com autorização final do proprietário**: chaves `sk_live_` + `BILLING_LIVE_APPROVED=true`.

## Pendências

- Interface de assinatura no app (status do plano, botões de assinar/gerenciar) — não implementada.
- Limites por plano (contador de alunos ativos mantido pelo backend).
- Página de métricas comerciais (MRR, churn etc.) a partir de `billingEvents`/`entitlement`.
- Emissão de nota fiscal de serviço (obrigação fiscal da empresa; fora do escopo do provedor).
