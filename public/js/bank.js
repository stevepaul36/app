// The Willowvale Bank: a savings jar that grows a little each morning, and loans explained in plain
// numbers before you agree to them. Loans themselves live in fate.js (E.debt); this adds savings and
// the repayment plan. Child-friendly on purpose: no hidden fees, and every figure is shown up front.

export const SAVINGS_RATE = 0.02; // 2% each morning
export const SAVINGS_CAP = 50;    // at most ✦ 50 interest a morning
export const LOAN_RATE = 0.05;    // the same 5% a morning fate.js charges

export function ensure(P) {
  if (!P.bank || typeof P.bank !== 'object') P.bank = { savings: 0, history: [] };
  if (!Number.isFinite(P.bank.savings) || P.bank.savings < 0) P.bank.savings = 0;
  if (!Array.isArray(P.bank.history)) P.bank.history = [];
  return P.bank;
}
const note = (B, day, text) => { B.history.unshift({ day, text }); B.history.length = Math.min(B.history.length, 12); };

export function deposit(P, you, amount, day = 0) {
  const B = ensure(P), n = Math.floor(Math.min(amount, you.coins));
  if (!(n > 0)) return { ok: false, msg: 'You have no coins to put away.' };
  you.coins -= n; B.savings += n; note(B, day, `Saved ✦ ${n}`);
  return { ok: true, msg: `Saved ✦ ${n}. Your savings: ✦ ${B.savings}.` };
}
export function withdraw(P, you, amount, day = 0) {
  const B = ensure(P), n = Math.floor(Math.min(amount, B.savings));
  if (!(n > 0)) return { ok: false, msg: 'Your savings jar is empty.' };
  B.savings -= n; you.coins += n; note(B, day, `Took out ✦ ${n}`);
  return { ok: true, msg: `Took out ✦ ${n}. Your savings: ✦ ${B.savings}.` };
}
/** Each morning: a loan is paid from savings first, then what's left earns interest. Returns lines for the morning post. */
export function morning(P, E, day = 0) {
  const B = ensure(P), lines = [];
  if (E && E.debt > 0 && B.savings > 0) {
    const pay = Math.min(B.savings, E.debt);
    B.savings -= pay; E.debt -= pay; note(B, day, `Paid ✦ ${pay} of your loan`);
    lines.push(`🏦 The bank used ✦ ${pay} of your savings to pay your loan.`);
  }
  const interest = Math.min(SAVINGS_CAP, Math.floor(B.savings * SAVINGS_RATE));
  if (interest > 0) { B.savings += interest; note(B, day, `Interest +✦ ${interest}`); lines.push(`🏦 Your savings earned ✦ ${interest} interest.`); }
  return lines;
}
/**
 * A repayment plan: pay `perDay` each morning on a loan of `debt` that grows `rate` a morning.
 * Returns how many days it takes and the total you pay, or null if the payment can't keep up.
 */
export function plan(debt, perDay, rate = LOAN_RATE, maxDays = 120) {
  if (!(debt > 0)) return { days: 0, total: 0, perDay };
  if (perDay <= Math.ceil(debt * rate)) return null;
  let d = debt, days = 0, total = 0;
  while (d > 0 && days < maxDays) { d = Math.ceil(d * (1 + rate)); const p = Math.min(perDay, d); d -= p; total += p; days++; }
  return d > 0 ? null : { days, total, perDay };
}
/** A friendly daily payment that clears a loan in about a week. */
export const suggestPerDay = debt => Math.max(10, Math.ceil((debt * 1.2) / 7 / 5) * 5);
/** What a new loan of `amount` would cost if repaid with the suggested plan. */
export function loanQuote(amount, existing = 0) {
  const total = amount + existing, perDay = suggestPerDay(total), p = plan(total, perDay);
  return { borrow: amount, owed: total, perDay, days: p?.days ?? 0, repay: p?.total ?? 0 };
}
