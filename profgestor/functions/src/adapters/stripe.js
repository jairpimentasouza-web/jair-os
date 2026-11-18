// Adaptador Stripe: verificação de assinatura com o SDK oficial, releitura da assinatura
// na API (fonte da verdade) e normalização para o núcleo de cobrança.
import { applySubscriptionState } from '../ledger.js';
import { planFromProviderPrice } from '../plans.js';

export const STRIPE_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'customer.subscription.paused', 'customer.subscription.resumed',
  'invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required',
]);
const SIGNATURE_TOLERANCE_SECONDS = 300; // rejeita replays com carimbo de tempo antigo

// Recusa chaves de produção enquanto o proprietário não aprovar a cobrança real.
export function assertStripeKeyAllowed(secretKey, env = process.env) {
  if (/^(sk|rk)_live_/.test(String(secretKey || '')) && env.BILLING_LIVE_APPROVED !== 'true') {
    throw new Error('Chave Stripe de produção bloqueada: defina BILLING_LIVE_APPROVED=true somente após aprovação do proprietário.');
  }
}

export function normalizeStripeSubscription(sub, priceIds) {
  const item = sub.items?.data?.[0];
  const price = item?.price || {};
  const pricedPlan = planFromProviderPrice({ priceId: price.id, amountCents: price.unit_amount, currency: price.currency }, priceIds);
  // O plano Fundador é o preço do Profissional com cupom; a etiqueta vem dos metadados do servidor.
  const planId = pricedPlan === 'profissional' && sub.metadata?.planId === 'fundador' ? 'fundador' : pricedPlan;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  return {
    provider: 'stripe',
    subscriptionId: sub.id,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null,
    orgId: sub.metadata?.orgId || null,
    planId,
    status: sub.status,
    currentPeriodEnd: periodEnd ? periodEnd * 1000 : 0,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  };
}

function subscriptionIdOf(event) {
  const obj = event.data?.object || {};
  if (obj.object === 'subscription') return obj.id;
  if (typeof obj.subscription === 'string') return obj.subscription;
  if (obj.subscription?.id) return obj.subscription.id;
  const fromLines = obj.parent?.subscription_details?.subscription;
  return typeof fromLines === 'string' ? fromLines : null;
}

// Retorna { status, body } para a resposta HTTP. Nunca expõe detalhes internos.
export function createStripeWebhookHandler({ stripe, webhookSecret, db, priceIds, now = () => Date.now(), log = console }) {
  return async function handle(rawBody, signatureHeader) {
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret, SIGNATURE_TOLERANCE_SECONDS);
    } catch (err) {
      log.warn?.('stripe.webhook.assinatura_invalida', { reason: err.type || err.message });
      return { status: 400, body: 'assinatura inválida' };
    }
    if (!STRIPE_EVENTS.has(event.type)) return { status: 200, body: 'ignorado' };
    const subscriptionId = subscriptionIdOf(event);
    if (!subscriptionId) return { status: 200, body: 'sem assinatura' };
    // O payload só aciona o processamento; o estado vem da API do provedor.
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const version = now();
    const state = normalizeStripeSubscription(sub, priceIds);
    if (!state.orgId) {
      log.error?.('stripe.webhook.sem_org', { eventId: event.id, subscriptionId });
      return { status: 200, body: 'assinatura sem organização' };
    }
    const r = await applySubscriptionState(db, { provider: 'stripe', eventId: event.id, state, version, now: version });
    log.info?.('stripe.webhook.processado', { eventId: event.id, type: event.type, orgId: state.orgId, result: r.result });
    return { status: 200, body: r.result };
  };
}
