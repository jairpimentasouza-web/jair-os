// Reconciliação periódica: relê no provedor todas as assinaturas conhecidas e corrige
// divergências (webhook perdido, atrasado ou entregue fora de ordem).
import { applySubscriptionState } from './ledger.js';
import { normalizeStripeSubscription } from './adapters/stripe.js';

export async function reconcileStripe({ db, stripe, priceIds, now = () => Date.now(), log = console }) {
  const snap = await db.collection('organizations').where('entitlement.provider', '==', 'stripe').get();
  const summary = { checked: 0, applied: 0, unchanged: 0, errors: 0 };
  const day = new Date(now()).toISOString().slice(0, 10);
  for (const org of snap.docs) {
    const ent = org.data().entitlement || {};
    if (!ent.subscriptionId) continue;
    summary.checked++;
    try {
      const sub = await stripe.subscriptions.retrieve(ent.subscriptionId);
      const state = { ...normalizeStripeSubscription(sub, priceIds), orgId: org.id };
      const version = now();
      const r = await applySubscriptionState(db, { provider: 'stripe', eventId: `reconcile_${day}_${org.id}_${version}`, state, version, now: version });
      const changed = r.result === 'applied' && (r.entitlement.status !== ent.status || r.entitlement.plan !== ent.plan);
      if (changed) summary.applied++; else summary.unchanged++;
    } catch (err) {
      summary.errors++;
      log.error?.('reconcile.falha', { orgId: org.id, message: err.message });
    }
  }
  return summary;
}
