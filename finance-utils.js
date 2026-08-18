// Чисті функції фінансової математики — винесені окремо, щоб їх можна було тестувати
// незалежно від UI та стану застосунку (D, sb, тощо).

export const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const curSign = c => c === 'USD' ? '$' : c === 'EUR' ? '€' : 'грн';

export const fmt = (n, c = 'UAH') => {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  const f = v % 1 === 0 ? 0 : 2;
  return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: f, maximumFractionDigits: 2 }).format(v) + ' ' + curSign(c);
};

export const fmt0 = (n, c = 'UAH') =>
  new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' ' + curSign(c);

// Прибирає розділювачі тисяч (NBSP   або звичайний пробіл), щоб можна було коректно
// розпарсити значення, яке вже показане у відформатованому інпуті.
export const ungroupDigits = s => String(s == null ? '' : s).replace(/[  ]/g, '');

export const num = s => parseFloat(ungroupDigits(s).replace(',', '.'));

// Вставляє NBSP-розділювач тисяч ( ) у цілу частину рядка, зберігаючи десяткову частину як є
// (для live-форматування грошових інпутів під час набору).
export function groupDigits(raw) {
  if (raw == null) return '';
  let s = ungroupDigits(raw);
  const neg = s.startsWith('-') ? '-' : '';
  if (neg) s = s.slice(1);
  const m = s.match(/^(\d*)([.,]?)(\d*)$/);
  if (!m) return neg + s;
  const intPart = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return neg + intPart + m[2] + m[3];
}

export function advanceDate(ds, rep) {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (rep === 'daily') dt.setDate(dt.getDate() + 1);
  else if (rep === 'weekly') dt.setDate(dt.getDate() + 7);
  else if (rep === 'monthly') dt.setMonth(dt.getMonth() + 1);
  else if (rep === 'yearly') dt.setFullYear(dt.getFullYear() + 1);
  const pad = x => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export const toUAH = (n, c, usdRate, eurRate) => c === 'USD' ? n * usdRate : c === 'EUR' ? n * eurRate : n;

// initial: рахунок.initial; txs: усі транзакції (уже відфільтровані по даті, якщо потрібно); accountId: чий баланс рахуємо.
export function computeBalance(initial, txs, accountId) {
  let b = Number(initial) || 0;
  for (const t of txs) {
    const am = Number(t.amount);
    if (t.type === 'income' && t.account_id === accountId) b += am;
    else if (t.type === 'expense' && t.account_id === accountId) b -= am;
    else if (t.type === 'transfer') {
      if (t.account_id === accountId) b -= am;
      if (t.to_account_id === accountId) b += (t.to_amount != null ? Number(t.to_amount) : am);
    }
  }
  return b;
}

export function computeBalanceAt(initial, txs, accountId, endISO) {
  return computeBalance(initial, txs.filter(t => t.occurred_at <= endISO), accountId);
}
