// Matriz de pagamentos: webhooks assinados (SDKs oficiais, sem rede), idempotência, ordem,
// transições de assinatura, manipulação de preço e efeito real nas regras do Firestore.
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { addDoc, collection } from 'firebase/firestore';
import { createEnv } from './helpers.js';
import { createStripeWebhookHandler, assertStripeKeyAllowed } from '../../functions/src/adapters/stripe.js';
import { createMercadoPagoWebhookHandler } from '../../functions/src/adapters/mercadopago.js';
import { createCheckoutSession } from '../../functions/src/checkout.js';
import { reconcileStripe } from '../../functions/src/reconcile.js';
import { computeEntitlement } from '../../functions/src/entitlements.js';

const Stripe = createRequire(new URL('../../functions/package.json', import.meta.url))('stripe');
const WHSEC = 'whsec_test_profgestor';
const MP_SECRET = 'mp_test_secret';
const PRICES = { STRIPE_PRICE_ESSENCIAL: 'price_essencial', STRIPE_PRICE_PROFISSIONAL: 'price_prof', STRIPE_COUPON_FUNDADOR: 'coupon_fundador' };
const DAY = 864e5;

let env, db, stripe, subs, sessions, clock;
const silent = { info() {}, warn() {}, error() {} };

before(async () => {
  env = await createEnv();
  if (!getApps().length) initializeApp({ projectId: 'demo-profgestor' });
  db = getFirestore();
});
after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  clock = Date.now();
  subs = new Map();
  sessions = [];
  stripe = new Stripe('sk_test_dummy');
  stripe.subscriptions.retrieve = async (id) => { if (!subs.has(id)) throw new Error('no such subscription'); return structuredClone(subs.get(id)); };
  stripe.checkout.sessions.create = async (params, opts) => { sessions.push({ params, opts }); return { url: 'https://checkout.stripe.test/s' }; };
  const set = (p, d) => db.doc(p).set(d);
  await Promise.all([
    set('organizations/org_t', { nome: 'Teste vencido', ownerUid: 'u_t', createdAt: Timestamp.fromMillis(clock - 30 * DAY) }),
    set('organizations/org_new', { nome: 'Recém-criada', ownerUid: 'u_new', createdAt: Timestamp.fromMillis(clock - 3 * DAY) }),
    set('organizations/org_jair', { nome: 'Original', ownerUid: 'u_j', createdAt: Timestamp.fromMillis(clock - 400 * DAY), billingExempt: true }),
    set('usuarios/u_t', { email: 'prof.t@example.com', role: 'admin', organizationId: 'org_t', ativo: true }),
    set('usuarios/u_new', { email: 'prof.new@example.com', role: 'admin', organizationId: 'org_new', ativo: true }),
    set('usuarios/u_colab', { email: 'colab@example.com', role: 'professor', organizationId: 'org_t', ativo: true }),
    set('usuarios/u_j', { email: 'owner@example.com', role: 'admin', organizationId: 'org_jair', ativo: true }),
  ]);
});

const sub = (id, { orgId = 'org_t', price = 'price_prof', amount = 4990, status = 'active', periodEnd = clock + 30 * DAY, planId, cancelAtPeriodEnd = false } = {}) => {
  const s = { id, object: 'subscription', customer: 'cus_1', status, cancel_at_period_end: cancelAtPeriodEnd, metadata: { orgId, ...(planId ? { planId } : {}) },
    items: { data: [{ price: { id: price, unit_amount: amount, currency: 'brl' }, current_period_end: Math.floor(periodEnd / 1000) }] } };
  subs.set(id, s);
  return s;
};
function stripeEvent(type, object, { id = `evt_${Math.random().toString(36).slice(2)}`, timestamp } = {}) {
  const payload = JSON.stringify({ id, object: 'event', type, created: Math.floor(Date.now() / 1000), data: { object } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC, timestamp });
  return { id, payload, header };
}
const handler = (now = () => Date.now()) => createStripeWebhookHandler({ stripe, webhookSecret: WHSEC, db, priceIds: PRICES, now, log: silent });
const send = async (ev, h = handler()) => h(Buffer.from(ev.payload), ev.header);
const ent = async (org = 'org_t') => (await db.doc(`organizations/${org}`).get()).data().entitlement;
const teacherWrite = (uid = 'u_t', org = 'org_t') => addDoc(collection(env.authenticatedContext(uid, { email_verified: true }).firestore(), 'alunos'), { organizationId: org, nome: 'X' });

describe('Stripe: ciclo de vida da assinatura', () => {
  it('novo assinante: checkout concluído libera a gravação (antes bloqueada pelo teste vencido)', async () => {
    await assertFails(teacherWrite());
    sub('sub_1');
    const r = await send(stripeEvent('checkout.session.completed', { object: 'checkout.session', subscription: 'sub_1' }));
    assert.deepEqual(r, { status: 200, body: 'applied' });
    const e = await ent();
    assert.equal(e.status, 'active');
    assert.equal(e.plan, 'profissional');
    await assertSucceeds(teacherWrite());
    await assertSucceeds(teacherWrite('u_colab'));
  });

  it('renovação: novo ciclo estende o acesso', async () => {
    sub('sub_1', { periodEnd: clock + 5 * DAY });
    await send(stripeEvent('customer.subscription.created', subs.get('sub_1')));
    const before = (await ent()).accessUntil.toMillis();
    sub('sub_1', { periodEnd: clock + 35 * DAY });
    await send(stripeEvent('invoice.paid', { object: 'invoice', subscription: 'sub_1' }));
    assert.ok((await ent()).accessUntil.toMillis() - before >= 29 * DAY);
  });

  it('falha de cobrança: past_due mantém acesso durante a carência; depois bloqueia', async () => {
    sub('sub_1', { status: 'past_due', periodEnd: clock - 1 * DAY });
    await send(stripeEvent('invoice.payment_failed', { object: 'invoice', subscription: 'sub_1' }));
    assert.equal((await ent()).status, 'past_due');
    await assertSucceeds(teacherWrite());
    const vencido = computeEntitlement({ planId: 'profissional', status: 'past_due', currentPeriodEnd: clock - 1 * DAY }, clock + 7 * DAY);
    assert.ok(vencido.accessUntil.getTime() <= clock + 7 * DAY, 'carência não ultrapassa 7 dias após o fim do ciclo');
  });

  it('cancelamento: ao fim do período a gravação é bloqueada', async () => {
    sub('sub_1', { cancelAtPeriodEnd: true });
    await send(stripeEvent('customer.subscription.updated', subs.get('sub_1')));
    assert.equal((await ent()).cancelAtPeriodEnd, true);
    await assertSucceeds(teacherWrite());
    sub('sub_1', { status: 'canceled', periodEnd: clock - 1000 });
    await send(stripeEvent('customer.subscription.deleted', subs.get('sub_1')));
    assert.equal((await ent()).status, 'canceled');
    await assertFails(teacherWrite());
  });

  it('estorno com cancelamento imediato revoga o acesso', async () => {
    sub('sub_1');
    await send(stripeEvent('customer.subscription.created', subs.get('sub_1')));
    sub('sub_1', { status: 'canceled' });
    await send(stripeEvent('customer.subscription.deleted', subs.get('sub_1')));
    await assertFails(teacherWrite());
  });

  it('reativação: nova assinatura após cancelamento volta a liberar', async () => {
    sub('sub_old', { status: 'canceled' });
    await send(stripeEvent('customer.subscription.deleted', subs.get('sub_old')));
    sub('sub_new');
    await send(stripeEvent('customer.subscription.created', subs.get('sub_new')));
    assert.equal((await ent()).subscriptionId, 'sub_new');
    await assertSucceeds(teacherWrite());
  });

  it('mudança de plano: Essencial → Profissional', async () => {
    sub('sub_1', { price: 'price_essencial', amount: 2990 });
    await send(stripeEvent('customer.subscription.created', subs.get('sub_1')));
    assert.equal((await ent()).plan, 'essencial');
    sub('sub_1', { price: 'price_prof', amount: 4990 });
    await send(stripeEvent('customer.subscription.updated', subs.get('sub_1')));
    assert.equal((await ent()).plan, 'profissional');
  });

  it('cancelamento tardio de assinatura antiga não derruba a nova', async () => {
    sub('sub_new');
    await send(stripeEvent('customer.subscription.created', subs.get('sub_new')));
    sub('sub_old', { status: 'canceled' });
    const r = await send(stripeEvent('customer.subscription.deleted', subs.get('sub_old')));
    assert.equal(r.body, 'superseded');
    assert.equal((await ent()).subscriptionId, 'sub_new');
  });
});

describe('Stripe: segurança e confiabilidade do webhook', () => {
  it('webhook duplicado é processado uma única vez', async () => {
    sub('sub_1');
    const ev = stripeEvent('customer.subscription.created', subs.get('sub_1'), { id: 'evt_dup' });
    assert.equal((await send(ev)).body, 'applied');
    assert.equal((await send(ev)).body, 'duplicate');
    const evs = await db.collection('billingEvents').where('eventId', '==', 'evt_dup').get();
    assert.equal(evs.size, 1);
  });

  it('webhook atrasado: evento antigo relê o estado atual e não regride a assinatura', async () => {
    sub('sub_1', { status: 'canceled' });
    await send(stripeEvent('customer.subscription.deleted', subs.get('sub_1')));
    const atrasado = stripeEvent('customer.subscription.created', { ...subs.get('sub_1'), status: 'active' });
    await send(atrasado); // payload diz "active", mas a API diz "canceled"
    assert.equal((await ent()).status, 'canceled');
  });

  it('corrida entre entregas paralelas: estado lido antes não sobrescreve estado lido depois', async () => {
    sub('sub_1', { status: 'active' });
    const t0 = Date.now();
    await send(stripeEvent('customer.subscription.updated', subs.get('sub_1')), handler(() => t0 + 2000));
    sub('sub_1', { status: 'past_due' });
    const r = await send(stripeEvent('customer.subscription.updated', subs.get('sub_1')), handler(() => t0 + 1000));
    assert.equal(r.body, 'stale');
    assert.equal((await ent()).status, 'active');
  });

  it('assinatura inválida, payload adulterado e replay antigo são recusados', async () => {
    sub('sub_1');
    const ev = stripeEvent('customer.subscription.created', subs.get('sub_1'));
    assert.equal((await handler()(Buffer.from(ev.payload.replace('org_t', 'org_new')), ev.header)).status, 400);
    assert.equal((await handler()(Buffer.from(ev.payload), undefined)).status, 400);
    const forged = `t=${Math.floor(Date.now() / 1000)},v1=${createHmac('sha256', 'outro_segredo').update(ev.payload).digest('hex')}`;
    assert.equal((await handler()(Buffer.from(ev.payload), forged)).status, 400);
    const old = stripeEvent('customer.subscription.created', subs.get('sub_1'), { timestamp: Math.floor(Date.now() / 1000) - 3600 });
    assert.equal((await send(old)).status, 400);
    assert.equal((await db.doc('organizations/org_t').get()).data().entitlement, undefined);
  });

  it('preço fora do catálogo nunca concede acesso', async () => {
    sub('sub_x', { price: 'price_criado_a_mao', amount: 100 });
    await send(stripeEvent('customer.subscription.created', subs.get('sub_x')));
    assert.equal((await ent()).status, 'blocked');
    await assertFails(teacherWrite());
  });

  it('conta original isenta não é afetada por eventos de cobrança', async () => {
    sub('sub_j', { orgId: 'org_jair', status: 'canceled' });
    assert.equal((await send(stripeEvent('customer.subscription.deleted', subs.get('sub_j')))).body, 'exempt_org');
    assert.equal((await db.doc('organizations/org_jair').get()).data().entitlement, undefined);
  });

  it('chave de produção é recusada sem aprovação explícita do proprietário', () => {
    assert.throws(() => assertStripeKeyAllowed('sk_live_abc', {}), /bloqueada/);
    assert.doesNotThrow(() => assertStripeKeyAllowed('sk_live_abc', { BILLING_LIVE_APPROVED: 'true' }));
    assert.doesNotThrow(() => assertStripeKeyAllowed('sk_test_abc', {}));
  });
});

describe('Checkout no servidor (manipulação de preço no frontend)', () => {
  const create = (planId, uid = 'u_new', extra = {}) => createCheckoutSession({ db, stripe, uid, planId, priceIds: PRICES, appUrl: 'https://app.test', now: clock, ...extra });

  it('preço, organização e teste restante vêm do servidor', async () => {
    await create('profissional');
    const { params } = sessions[0];
    assert.deepEqual(params.line_items, [{ price: 'price_prof', quantity: 1 }]);
    assert.deepEqual(params.subscription_data.metadata, { orgId: 'org_new', planId: 'profissional' });
    assert.equal(params.subscription_data.trial_end, Math.floor((clock - 3 * DAY + 14 * DAY) / 1000));
    assert.equal(params.client_reference_id, 'org_new');
  });
  it('plano inexistente, plano Equipe e campos extras do cliente não passam', async () => {
    await assert.rejects(create('gratis'), (e) => e.code === 'invalid-argument');
    await assert.rejects(create('__proto__'), (e) => e.code === 'invalid-argument');
    await assert.rejects(create('equipe'), (e) => e.code === 'failed-precondition');
  });
  it('somente o admin ativo da organização assina; conta isenta não assina', async () => {
    await assert.rejects(create('profissional', 'u_colab'), (e) => e.code === 'permission-denied');
    await assert.rejects(create('profissional', null), (e) => e.code === 'unauthenticated');
    await assert.rejects(create('profissional', 'u_j'), (e) => e.code === 'failed-precondition');
  });
  it('Fundador aplica o cupom de 12 meses e respeita o limite de vagas', async () => {
    await create('fundador');
    assert.deepEqual(sessions[0].params.discounts, [{ coupon: 'coupon_fundador' }]);
    assert.equal(sessions[0].params.subscription_data.metadata.planId, 'fundador');
    const batch = db.batch();
    for (let i = 0; i < 100; i++) batch.set(db.doc(`organizations/org_f${i}`), { nome: `F${i}`, entitlement: { plan: 'fundador', status: 'active' } });
    await batch.commit();
    await assert.rejects(create('fundador'), (e) => e.code === 'resource-exhausted');
    await assert.doesNotReject(create('profissional'));
  });
  it('assinatura ativa existente impede segundo checkout', async () => {
    await db.doc('organizations/org_new').update({ entitlement: { status: 'active', subscriptionId: 'sub_1', plan: 'essencial' } });
    await assert.rejects(create('profissional'), (e) => e.code === 'already-exists');
  });
});

describe('Reconciliação periódica', () => {
  it('corrige divergência quando um webhook foi perdido', async () => {
    sub('sub_1');
    await send(stripeEvent('customer.subscription.created', subs.get('sub_1')));
    sub('sub_1', { status: 'canceled' }); // cancelamento cujo webhook nunca chegou
    const summary = await reconcileStripe({ db, stripe, priceIds: PRICES, log: silent });
    assert.deepEqual(summary, { checked: 1, applied: 1, unchanged: 0, errors: 0 });
    assert.equal((await ent()).status, 'canceled');
  });
});

describe('Mercado Pago (adaptador alternativo, validador oficial do SDK)', () => {
  // ts em segundos (exemplo oficial: ts=1704908010). lower=true reproduz a regra antiga da documentação.
  const mpSign = (dataId, requestId, ts = Math.floor(Date.now() / 1000), lower = false) => {
    const manifest = `id:${lower ? String(dataId).toLowerCase() : dataId};request-id:${requestId};ts:${ts};`;
    return `ts=${ts},v1=${createHmac('sha256', MP_SECRET).update(manifest).digest('hex')}`;
  };
  const preapprovals = new Map();
  const payments = new Map();
  const api = { getPreapproval: async (id) => preapprovals.get(id), getAuthorizedPayment: async (id) => payments.get(id) };
  const mp = () => createMercadoPagoWebhookHandler({ secret: MP_SECRET, db, api, log: silent });
  const pre = (id, { amount = 49.9, status = 'authorized', ref = 'org:org_t|plan:profissional' } = {}) =>
    preapprovals.set(id, { id, status, external_reference: ref, payer_id: 99, next_payment_date: new Date(clock + 30 * DAY).toISOString(), auto_recurring: { transaction_amount: amount, currency_id: 'BRL' } });
  const call = (type, dataId, { requestId = 'req-1', sig, id = `n_${Math.random()}` } = {}) =>
    mp()({ query: { type, 'data.id': dataId }, headers: { 'x-request-id': requestId, 'x-signature': sig ?? mpSign(dataId, requestId) }, body: { id, type, data: { id: dataId } } });

  it('assinatura autorizada válida libera o acesso', async () => {
    pre('PRE_ABC');
    assert.deepEqual(await call('subscription_preapproval', 'PRE_ABC'), { status: 200, body: 'applied' });
    assert.equal((await ent()).status, 'active');
    await assertSucceeds(teacherWrite());
  });
  it('aceita data.id assinado como recebido ou em minúsculas (contratos v3 e documentação)', async () => {
    pre('PRE_ABC');
    assert.equal((await call('subscription_preapproval', 'PRE_ABC', { sig: mpSign('PRE_ABC', 'req-1', undefined, true) })).body, 'applied');
  });
  it('assinatura inválida ou replay antigo → 401', async () => {
    pre('PRE_ABC');
    assert.equal((await call('subscription_preapproval', 'PRE_ABC', { sig: mpSign('PRE_ABC', 'req-1').replace(/.$/, (c) => (c === '0' ? '1' : '0')) })).status, 401);
    assert.equal((await call('subscription_preapproval', 'PRE_ABC', { sig: mpSign('PRE_ABC', 'req-1', Math.floor(Date.now() / 1000) - 3600) })).status, 401);
    assert.equal((await call('subscription_preapproval', 'PRE_ABC', { sig: '' })).status, 401);
  });
  it('valor diferente do catálogo não concede acesso', async () => {
    pre('PRE_CHEAP', { amount: 1 });
    await call('subscription_preapproval', 'PRE_CHEAP');
    assert.equal((await ent()).status, 'blocked');
  });
  it('pagamento recorrente recusado → past_due', async () => {
    pre('PRE_ABC');
    payments.set('AP_1', { id: 'AP_1', preapproval_id: 'PRE_ABC', payment: { status: 'rejected' } });
    await call('subscription_authorized_payment', 'AP_1');
    assert.equal((await ent()).status, 'past_due');
  });
  it('notificação duplicada é idempotente', async () => {
    pre('PRE_ABC');
    assert.equal((await call('subscription_preapproval', 'PRE_ABC', { id: 'n_fixa' })).body, 'applied');
    assert.equal((await call('subscription_preapproval', 'PRE_ABC', { id: 'n_fixa' })).body, 'duplicate');
  });
});
