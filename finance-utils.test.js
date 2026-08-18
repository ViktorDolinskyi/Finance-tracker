// Запуск: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curSign, fmt, num, advanceDate, toUAH, computeBalance, computeBalanceAt } from './finance-utils.js';

test('curSign', () => {
  assert.equal(curSign('USD'), '$');
  assert.equal(curSign('EUR'), '€');
  assert.equal(curSign('UAH'), 'грн');
  assert.equal(curSign(undefined), 'грн');
});

test('num parses both comma and dot as decimal separator', () => {
  assert.equal(num('1234,56'), 1234.56);
  assert.equal(num('1234.56'), 1234.56);
  assert.equal(num('100'), 100);
});

test('fmt shows 0 decimals for whole amounts, 2 for fractional', () => {
  // Intl.NumberFormat('uk-UA') розділяє тисячі невидимим NBSP-символом, не звичайним пробілом — нормалізуємо перед звіркою.
  const norm = s => s.replace(/ /g, ' ');
  assert.equal(norm(fmt(1000, 'UAH')), '1 000 грн');
  assert.equal(norm(fmt(1000.5, 'UAH')), '1 000,50 грн');
  assert.equal(norm(fmt(99.99, 'USD')), '99,99 $');
});

test('advanceDate: daily/weekly/yearly are exact, monthly rolls over on short months', () => {
  assert.equal(advanceDate('2026-01-31', 'daily'), '2026-02-01');
  assert.equal(advanceDate('2026-01-15', 'weekly'), '2026-01-22');
  assert.equal(advanceDate('2026-01-31', 'monthly'), '2026-03-03'); // немає 31 лютого — JS переносить на березень
  assert.equal(advanceDate('2026-01-15', 'yearly'), '2027-01-15');
});

test('toUAH converts by given rates, UAH passes through unchanged', () => {
  assert.equal(toUAH(100, 'UAH', 41, 45), 100);
  assert.equal(toUAH(10, 'USD', 41, 45), 410);
  assert.equal(toUAH(10, 'EUR', 41, 45), 450);
});

test('computeBalance: income/expense/transfer affect only the matching account', () => {
  const txs = [
    { type: 'income', account_id: 'a', amount: 100 },
    { type: 'expense', account_id: 'a', amount: 30 },
    { type: 'income', account_id: 'b', amount: 999 }, // інший рахунок — не враховується
    { type: 'transfer', account_id: 'a', to_account_id: 'b', amount: 20 },
    { type: 'transfer', account_id: 'b', to_account_id: 'a', amount: 15, to_amount: 14 },
  ];
  // 500 + 100 - 30 (переказ з a: -20) + (переказ в a: +14 за to_amount) = 564
  assert.equal(computeBalance(500, txs, 'a'), 564);
});

test('computeBalance: transfer without to_amount falls back to amount', () => {
  const txs = [{ type: 'transfer', account_id: 'x', to_account_id: 'y', amount: 50 }];
  assert.equal(computeBalance(0, txs, 'y'), 50);
});

test('computeBalanceAt: ignores transactions after the cutoff date', () => {
  const txs = [
    { type: 'income', account_id: 'a', amount: 100, occurred_at: '2026-01-01T00:00:00Z' },
    { type: 'income', account_id: 'a', amount: 50, occurred_at: '2026-02-01T00:00:00Z' },
  ];
  assert.equal(computeBalanceAt(0, txs, 'a', '2026-01-31T23:59:59Z'), 100);
  assert.equal(computeBalanceAt(0, txs, 'a', '2026-02-28T23:59:59Z'), 150);
});
