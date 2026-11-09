// Catálogo de planos — fonte única de verdade do preço no servidor.
// O cliente só envia o identificador do plano; valor, moeda e desconto vêm daqui.
// Preços são hipóteses comerciais iniciais (a validar no piloto).

export const TRIAL_DAYS = 14; // deve coincidir com firestore.rules (orgWritable)
export const PAST_DUE_GRACE_DAYS = 7; // acesso mantido durante a recuperação de pagamento
export const RENEWAL_SLACK_HOURS = 48; // folga para a confirmação da renovação chegar

export const PLANS = Object.freeze({
  essencial: Object.freeze({
    id: 'essencial', nome: 'Essencial', priceCents: 2990, currency: 'brl', interval: 'month',
    sellable: true, priceKey: 'STRIPE_PRICE_ESSENCIAL',
    limits: Object.freeze({ alunosAtivos: 25 }),
  }),
  profissional: Object.freeze({
    id: 'profissional', nome: 'Profissional', priceCents: 4990, currency: 'brl', interval: 'month',
    sellable: true, priceKey: 'STRIPE_PRICE_PROFISSIONAL',
    limits: Object.freeze({ alunosAtivos: null }),
  }),
  // Fundador: recursos do Profissional por R$ 39,90 nos 12 primeiros meses (cupom de R$ 10,00
  // por 12 ciclos sobre o preço do Profissional); depois, preço normal do Profissional.
  fundador: Object.freeze({
    id: 'fundador', nome: 'Fundador', priceCents: 3990, currency: 'brl', interval: 'month',
    sellable: true, priceKey: 'STRIPE_PRICE_PROFISSIONAL', couponKey: 'STRIPE_COUPON_FUNDADOR',
    promoMonths: 12, basePlan: 'profissional', maxSubscribers: 100,
    limits: Object.freeze({ alunosAtivos: null }),
  }),
  // Não vender antes de existir multiusuário funcional (critério de prontidão).
  equipe: Object.freeze({
    id: 'equipe', nome: 'Equipe', priceCents: 11990, currency: 'brl', interval: 'month',
    sellable: false, notSellableReason: 'Recursos multiusuário ainda não disponíveis.',
    limits: Object.freeze({ alunosAtivos: null }),
  }),
});

export function getSellablePlan(planId) {
  const plan = Object.prototype.hasOwnProperty.call(PLANS, planId) ? PLANS[planId] : null;
  if (!plan) throw Object.assign(new Error('Plano inexistente.'), { code: 'invalid-argument' });
  if (!plan.sellable) throw Object.assign(new Error(plan.notSellableReason || 'Plano indisponível.'), { code: 'failed-precondition' });
  return plan;
}

// Mapeia um preço do provedor de volta ao catálogo. Preço desconhecido nunca concede acesso.
export function planFromProviderPrice({ priceId, amountCents, currency }, priceIds) {
  for (const plan of Object.values(PLANS)) {
    if (plan.priceKey && priceIds[plan.priceKey] && priceIds[plan.priceKey] === priceId && plan.id !== 'fundador') return plan.id;
  }
  if (amountCents != null && currency) {
    const match = Object.values(PLANS).find((p) => p.sellable && p.priceCents === amountCents && p.currency === String(currency).toLowerCase());
    if (match) return match.id;
  }
  return null;
}
