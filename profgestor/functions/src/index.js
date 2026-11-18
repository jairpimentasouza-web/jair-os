// Cloud Functions (2ª geração) do ProfGestor V5.
// NÃO PUBLICADAS: exigem aprovação do proprietário, projeto de homologação e segredos
// configurados no Secret Manager. Chaves de produção ficam bloqueadas até
// BILLING_LIVE_APPROVED=true (ver docs/PAGAMENTOS.md).
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';
import { createStripeWebhookHandler, assertStripeKeyAllowed } from './adapters/stripe.js';
import { createCheckoutSession, createPortalSession } from './checkout.js';
import { reconcileStripe } from './reconcile.js';

initializeApp();
const db = getFirestore();
const REGION = 'southamerica-east1';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const APP_URL = defineString('APP_URL', { default: 'https://gestao-aulas-jair.web.app' });
const PRICE_ESSENCIAL = defineString('STRIPE_PRICE_ESSENCIAL', { default: '' });
const PRICE_PROFISSIONAL = defineString('STRIPE_PRICE_PROFISSIONAL', { default: '' });
const COUPON_FUNDADOR = defineString('STRIPE_COUPON_FUNDADOR', { default: '' });

const priceIds = () => ({
  STRIPE_PRICE_ESSENCIAL: PRICE_ESSENCIAL.value(),
  STRIPE_PRICE_PROFISSIONAL: PRICE_PROFISSIONAL.value(),
  STRIPE_COUPON_FUNDADOR: COUPON_FUNDADOR.value(),
});
function stripeClient() {
  const key = STRIPE_SECRET_KEY.value();
  assertStripeKeyAllowed(key);
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 });
}
const toHttpsError = (err) => (err instanceof HttpsError ? err
  : new HttpsError(['invalid-argument', 'failed-precondition', 'permission-denied', 'unauthenticated', 'already-exists', 'resource-exhausted'].includes(err.code) ? err.code : 'internal', err.code ? err.message : 'Falha ao processar a assinatura.'));

export const stripeWebhook = onRequest(
  { region: REGION, secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], maxInstances: 5, concurrency: 20, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('método não permitido'); return; }
    const handle = createStripeWebhookHandler({ stripe: stripeClient(), webhookSecret: STRIPE_WEBHOOK_SECRET.value(), db, priceIds: priceIds(), log: logger });
    try {
      const r = await handle(req.rawBody, req.get('stripe-signature'));
      res.status(r.status).send(r.body);
    } catch (err) {
      logger.error('stripe.webhook.erro', { message: err.message });
      res.status(500).send('erro'); // o Stripe reenviará; o processamento é idempotente
    }
  });

export const criarCheckoutAssinatura = onCall(
  { region: REGION, secrets: [STRIPE_SECRET_KEY], maxInstances: 5 },
  async (req) => {
    try {
      return await createCheckoutSession({ db, stripe: stripeClient(), uid: req.auth?.uid, planId: String(req.data?.planId || ''), priceIds: priceIds(), appUrl: APP_URL.value() });
    } catch (err) { throw toHttpsError(err); }
  });

export const abrirPortalAssinatura = onCall(
  { region: REGION, secrets: [STRIPE_SECRET_KEY], maxInstances: 5 },
  async (req) => {
    try { return await createPortalSession({ db, stripe: stripeClient(), uid: req.auth?.uid, appUrl: APP_URL.value() }); }
    catch (err) { throw toHttpsError(err); }
  });

export const reconciliarAssinaturas = onSchedule(
  { region: REGION, schedule: '17 4 * * *', timeZone: 'America/Sao_Paulo', secrets: [STRIPE_SECRET_KEY], maxInstances: 1 },
  async () => {
    const summary = await reconcileStripe({ db, stripe: stripeClient(), priceIds: priceIds(), log: logger });
    logger.info('reconcile.resumo', summary);
  });
