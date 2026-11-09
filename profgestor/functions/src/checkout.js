// Criação de checkout e do portal de assinatura (Stripe), sempre no servidor.
// O cliente envia apenas { planId }. Preço, cupom, organização e período de teste são
// decididos aqui a partir do perfil autenticado e do catálogo — manipular o frontend não
// altera o valor cobrado.
import { getSellablePlan, TRIAL_DAYS } from './plans.js';

const DAY = 24 * 3600 * 1000;
const fail = (code, message) => Object.assign(new Error(message), { code });

async function adminOrg(db, uid) {
  if (!uid) throw fail('unauthenticated', 'Faça login.');
  const profile = await db.doc(`usuarios/${uid}`).get();
  const p = profile.exists ? profile.data() : null;
  if (!p || p.ativo !== true || p.role !== 'admin' || !p.organizationId) throw fail('permission-denied', 'Somente o administrador da conta gerencia a assinatura.');
  const org = await db.doc(`organizations/${p.organizationId}`).get();
  if (!org.exists) throw fail('failed-precondition', 'Organização não encontrada.');
  return { profile: p, orgId: p.organizationId, org: org.data() };
}

export async function createCheckoutSession({ db, stripe, uid, planId, priceIds, appUrl, now = Date.now() }) {
  const plan = getSellablePlan(planId);
  const { profile, orgId, org } = await adminOrg(db, uid);
  if (org.billingExempt === true) throw fail('failed-precondition', 'Esta conta é isenta de cobrança.');
  const ent = org.entitlement || {};
  if (['active', 'past_due'].includes(ent.status) && ent.subscriptionId) {
    throw fail('already-exists', 'Já existe uma assinatura ativa. Use o portal para trocar de plano.');
  }
  const price = priceIds[plan.priceKey];
  if (!price) throw fail('failed-precondition', 'Preço não configurado no servidor.');
  if (plan.id === 'fundador') {
    const used = (await db.collection('organizations').where('entitlement.plan', '==', 'fundador').count().get()).data().count;
    if (used >= plan.maxSubscribers) throw fail('resource-exhausted', 'Vagas do plano Fundador esgotadas.');
    if (!priceIds[plan.couponKey]) throw fail('failed-precondition', 'Cupom Fundador não configurado.');
  }
  const createdAt = org.createdAt?.toMillis ? org.createdAt.toMillis() : Number(org.createdAt) || now;
  const trialEnd = createdAt + TRIAL_DAYS * DAY;
  // Mantém os dias de teste restantes (o Stripe exige ao menos 48 h de antecedência).
  const subscription_data = { metadata: { orgId, planId: plan.id } };
  if (trialEnd - now > 2 * DAY) subscription_data.trial_end = Math.floor(trialEnd / 1000);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    subscription_data,
    ...(plan.id === 'fundador' ? { discounts: [{ coupon: priceIds[plan.couponKey] }] } : { allow_promotion_codes: true }),
    client_reference_id: orgId,
    customer: ent.customerId || undefined,
    customer_email: ent.customerId ? undefined : profile.email,
    metadata: { orgId, planId: plan.id },
    locale: 'pt-BR',
    success_url: `${appUrl}/?assinatura=sucesso`,
    cancel_url: `${appUrl}/?assinatura=cancelada`,
  }, { idempotencyKey: `checkout_${orgId}_${plan.id}_${Math.floor(now / 60000)}` });
  return { url: session.url };
}

export async function createPortalSession({ db, stripe, uid, appUrl }) {
  const { org } = await adminOrg(db, uid);
  const customer = org.entitlement?.customerId;
  if (!customer) throw fail('failed-precondition', 'Ainda não há assinatura para gerenciar.');
  const s = await stripe.billingPortal.sessions.create({ customer, return_url: `${appUrl}/` });
  return { url: s.url };
}
