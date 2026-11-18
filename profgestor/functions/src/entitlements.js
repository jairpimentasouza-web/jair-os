// Cálculo do direito de uso a partir do estado normalizado da assinatura.
// O resultado é gravado em organizations/{orgId}.entitlement e lido pelas regras do
// Firestore (escrita liberada somente com status 'active' ou 'past_due' e accessUntil futuro).
import { PAST_DUE_GRACE_DAYS, RENEWAL_SLACK_HOURS } from './plans.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Estado normalizado (independente de provedor):
// { provider, subscriptionId, customerId, orgId, planId, status, currentPeriodEnd (ms),
//   cancelAtPeriodEnd (bool) }
// status ∈ trialing | active | past_due | canceled | unpaid | incomplete | paused
export function computeEntitlement(state, now = Date.now()) {
  const periodEnd = Number(state.currentPeriodEnd) || 0;
  const base = { plan: state.planId || null, cancelAtPeriodEnd: !!state.cancelAtPeriodEnd };
  if (!state.planId) return { ...base, status: 'blocked', reason: 'plano_desconhecido', accessUntil: new Date(now) };
  switch (state.status) {
    case 'trialing':
    case 'active':
      return { ...base, status: 'active', accessUntil: new Date(Math.max(periodEnd, now) + RENEWAL_SLACK_HOURS * HOUR) };
    case 'past_due':
      // Recuperação de pagamento: mantém acesso por um período de carência após o fim do ciclo.
      return { ...base, status: 'past_due', accessUntil: new Date(Math.max(periodEnd, now - PAST_DUE_GRACE_DAYS * DAY) + PAST_DUE_GRACE_DAYS * DAY) };
    case 'canceled':
      return { ...base, status: 'canceled', accessUntil: new Date(now) };
    default: // unpaid, incomplete, incomplete_expired, paused e desconhecidos: sem escrita
      return { ...base, status: 'blocked', reason: state.status || 'desconhecido', accessUntil: new Date(now) };
  }
}

export const WRITABLE_STATUSES = ['active', 'past_due'];
