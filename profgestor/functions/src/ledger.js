// Aplicação idempotente e ordenada de mudanças de assinatura.
//
// Garantias (numa única transação do Firestore):
//   - idempotência: billingEvents/{provider}_{eventId} registra cada evento uma única vez;
//     reentregas e replays são reconhecidos e não têm efeito;
//   - ordem: cada estado carrega `version` (instante em que foi lido no provedor); um estado
//     mais antigo que o já aplicado é descartado (corrida entre entregas paralelas);
//   - substituição: uma assinatura diferente da vigente só substitui a atual se estiver ativa,
//     evitando que o cancelamento de uma assinatura antiga derrube a nova (troca de plano).
// billingEvents não guarda dados pessoais nem o payload do provedor.
import { computeEntitlement, WRITABLE_STATUSES } from './entitlements.js';

const safeId = (s) => String(s).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 300);

export async function applySubscriptionState(db, { provider, eventId, state, version, now = Date.now() }) {
  if (!provider || !eventId || !state?.orgId || !Number.isFinite(version)) throw new Error('Evento de cobrança incompleto.');
  const evRef = db.doc(`billingEvents/${safeId(`${provider}_${eventId}`)}`);
  const orgRef = db.doc(`organizations/${safeId(state.orgId)}`);
  return db.runTransaction(async (tx) => {
    const [ev, org] = [await tx.get(evRef), await tx.get(orgRef)];
    if (ev.exists) return { result: 'duplicate' };
    const record = (result, extra = {}) => tx.set(evRef, {
      provider, eventId: String(eventId), orgId: state.orgId, subscriptionId: state.subscriptionId || null,
      planId: state.planId || null, providerStatus: state.status || null, result, version, receivedAt: new Date(now), ...extra,
    });
    if (!org.exists) { record('unknown_org'); return { result: 'unknown_org' }; }
    if (org.data().billingExempt === true) { record('exempt_org'); return { result: 'exempt_org' }; }
    const current = org.data().entitlement || {};
    const ent = computeEntitlement(state, now);
    if (current.subscriptionId && state.subscriptionId && current.subscriptionId !== state.subscriptionId
        && WRITABLE_STATUSES.includes(current.status) && !WRITABLE_STATUSES.includes(ent.status)) {
      record('superseded'); return { result: 'superseded' };
    }
    if (current.subscriptionId === state.subscriptionId && Number(current.sourceVersion || 0) >= version) {
      record('stale'); return { result: 'stale' };
    }
    const entitlement = {
      ...ent, provider, subscriptionId: state.subscriptionId || null, customerId: state.customerId || null,
      sourceVersion: version, updatedAt: new Date(now),
    };
    tx.update(orgRef, { entitlement });
    record('applied', { status: ent.status });
    return { result: 'applied', entitlement };
  });
}
