// Adaptador Mercado Pago (alternativa avaliada): validação com o validador oficial do SDK,
// releitura da assinatura (preapproval) na API e normalização para o núcleo de cobrança.
import { WebhookSignatureValidator } from 'mercadopago';
import { applySubscriptionState } from '../ledger.js';
import { PLANS } from '../plans.js';

const TOLERANCE_SECONDS = 300;
const STATUS = { authorized: 'active', paused: 'paused', cancelled: 'canceled', canceled: 'canceled', pending: 'incomplete' };

// external_reference é definido pelo backend ao criar a assinatura: "org:<orgId>|plan:<planId>".
export function parseExternalReference(ref) {
  const m = /^org:([A-Za-z0-9_-]{1,120})\|plan:([a-z]{1,30})$/.exec(String(ref || ''));
  return m ? { orgId: m[1], planId: m[2] } : null;
}

export function normalizePreapproval(p, { lastPaymentRejected = false } = {}) {
  const ref = parseExternalReference(p.external_reference);
  const amountCents = Math.round(Number(p.auto_recurring?.transaction_amount || 0) * 100);
  const plan = ref && PLANS[ref.planId];
  // Defesa em profundidade: valor cobrado precisa ser o do catálogo do servidor.
  const planId = plan && plan.sellable && plan.priceCents === amountCents && String(p.auto_recurring?.currency_id || '').toUpperCase() === 'BRL' ? plan.id : null;
  let status = STATUS[p.status] || 'incomplete';
  if (status === 'active' && lastPaymentRejected) status = 'past_due';
  const next = Date.parse(p.next_payment_date || '') || 0;
  return {
    provider: 'mercadopago', subscriptionId: String(p.id), customerId: p.payer_id ? String(p.payer_id) : null,
    orgId: ref?.orgId || null, planId, status, currentPeriodEnd: next, cancelAtPeriodEnd: false,
  };
}

// api: { getPreapproval(id), getAuthorizedPayment(id) } — chamadas autenticadas à API do MP.
export function createMercadoPagoWebhookHandler({ secret, db, api, now = () => Date.now(), log = console }) {
  return async function handle({ query = {}, headers = {}, body = {} }) {
    const dataId = query['data.id'] ?? query.data_id ?? body?.data?.id;
    // SDK oficial v3: ts em segundos e data.id como recebido. A documentação pedia data.id
    // alfanumérico em minúsculas; aceitamos as duas formas (ambas exigem o segredo).
    const validate = (id) => WebhookSignatureValidator.validate({
      xSignature: headers['x-signature'], xRequestId: headers['x-request-id'], dataId: id,
      secret, toleranceSeconds: TOLERANCE_SECONDS, now,
    });
    try {
      const id = dataId != null ? String(dataId) : undefined;
      try { validate(id); } catch (e) {
        if (e.reason === 'SignatureMismatch' && id && id !== id.toLowerCase()) validate(id.toLowerCase()); else throw e;
      }
    } catch (err) {
      log.warn?.('mp.webhook.assinatura_invalida', { reason: err.reason || err.message });
      return { status: 401, body: 'assinatura inválida' };
    }
    const type = query.type || body?.type || query.topic;
    let preapproval, lastPaymentRejected = false;
    if (type === 'subscription_preapproval') preapproval = await api.getPreapproval(String(dataId));
    else if (type === 'subscription_authorized_payment') {
      const ap = await api.getAuthorizedPayment(String(dataId));
      lastPaymentRejected = ap?.payment?.status === 'rejected' || ap?.status === 'rejected';
      preapproval = await api.getPreapproval(String(ap.preapproval_id));
    } else return { status: 200, body: 'ignorado' };
    const version = now();
    const state = normalizePreapproval(preapproval, { lastPaymentRejected });
    if (!state.orgId) return { status: 200, body: 'assinatura sem organização' };
    const eventId = body?.id != null ? `${body.id}` : `${headers['x-request-id']}`;
    const r = await applySubscriptionState(db, { provider: 'mercadopago', eventId, state, version, now: version });
    log.info?.('mp.webhook.processado', { type, orgId: state.orgId, result: r.result });
    return { status: 200, body: r.result };
  };
}
