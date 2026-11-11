import assert from 'node:assert/strict';
import {fields, agree, confirmChoice, rankLines} from './fields.js';
import {typedOffer} from './date-kind.js';

let checks = 0;
const high = text => ({text, confidence: .99});
const expiry = {role: 'expiry'};
const dates = text => fields(text).dates;
const expectDate = (text, expected, precision = 'day') => {
  assert.equal(dates(text).length, 1, text);
  assert.equal(dates(text)[0].options[0].date, expected, text);
  assert.equal(dates(text)[0].options[0].precision, precision, text);
  checks++;
};

for (const text of ['SEP 14 2032', 'SEP142032', '14SEP2032', '14 September 2032', '14 septembre 2032']) {
  expectDate(text, '2032-09-14');
}
for (const text of ['JAN 12 2032', 'JAN122032', '12JAN2032']) expectDate(text, '2032-01-12');
for (const text of ['SEP2032', 'SEP 2032', 'September 2032']) expectDate(text, '2032-09', 'month');
expectDate('29FEB2032', '2032-02-29');

for (const text of [
  'FEB 29 2031', 'FEB 30 2032', 'APR312032', '31APR2032', 'JAN 12 2032x',
  'JAN122032L55', 'L12JAN2032', 'CODESEP142032', 'JAN 12 2032.04',
  'JAN 12 2032/10/2033',
]) {
  assert.deepEqual(dates(text), [], text);
  checks++;
}

const full = agree(high('SEP142032'), high('SEP 14 2032'), expiry);
assert.equal(full.choices[0].date, '2032-09-14');
assert.equal(full.requiresReview, true);
assert.equal(full.automaticExpiryAllowed, false);
assert.throws(() => confirmChoice(full, 0));
assert.equal(confirmChoice(full, 0, {expiryConfirmed: true}).date, '2032-09-14');
checks++;

const month = agree(high('SEP2032'), high('SEP 2032'), expiry);
assert.deepEqual(confirmChoice(month, 0, {expiryConfirmed: true}), {
  date: '2032-09', precision: 'month', yearSource: 'printed',
});
checks++;

const short = agree(high('12OCT32'), high('12 OCT 32'), expiry);
assert.equal(short.needsYear, true);
assert.equal(short.choices[0].year, undefined);
assert.equal(short.choices[0].yearSuffix, '32');
assert.throws(() => confirmChoice(short, 0, {expiryConfirmed: true}));
assert.throws(() => confirmChoice(short, 0, {expiryConfirmed: true, year: 2031}));
assert.equal(confirmChoice(short, 0, {expiryConfirmed: true, year: 2032}).date, '2032-10-12');
checks++;

const partial = agree(high('18 JUN'), high('18JUN'), expiry);
assert.deepEqual(partial.choices, [{precision: 'day_month', day: 18, month: 6}]);
assert.equal(partial.needsYear, true);
assert.throws(() => confirmChoice(partial, 0, {expiryConfirmed: true}));
assert.deepEqual(agree(high('18 JUN'), high('18JUN'), {role: 'unknown'}).choices, []);
checks++;

for (const label of ['Sell by', 'Prod.', 'Packed']) {
  const pair = high(label + ' SEP 14 2032');
  assert.deepEqual(typedOffer(pair, pair, {role: 'non_expiry'}).choices, [], label);
  checks++;
}
for (const label of ['LOT', 'L']) {
  assert.deepEqual(dates(label + '12OCT32'), [], label);
  checks++;
}
assert.deepEqual(agree(high('SEP142032'), high('SEP 15 2032'), expiry).choices, []);
assert.deepEqual(agree({text: 'SEP142032', confidence: .79}, high('SEP 14 2032'), expiry).choices, []);
assert.equal(dates('BEST BEFORE SEP 14 2032 / 19:02').length, 1);
assert.equal(dates('MHD SEP 14 2032 / 6789')[0].needsSuffixReview, true);
assert.deepEqual(agree(high('SEP 14 2032 / 01.01.2033'), high('SEP 14 2032 / 01.01.2033'), expiry).choices, []);
checks += 5;

const ambiguousMonth = agree(high('JUN 18'), high('JUN18'), expiry);
assert.equal(ambiguousMonth.needsFormat, true);
assert.deepEqual(ambiguousMonth.choices, [{precision: 'day_month', day: 18, month: 6}, {precision: 'month', month: 6, yearSuffix: '18'}]);
assert.equal(ambiguousMonth.needsYear, true);
checks++;

const box = (text, y) => ({text, confidence: .99, box: [[0,y],[300,y],[300,y+25],[0,y+25]]});
const ranked = rankLines([box('BEST BEFORE', 0), box('SEP 14 2032', 30)]);
assert.equal(ranked.length, 1);
assert.equal(ranked[0].proposalFields.dates[0].options[0].date, '2032-09-14');
checks++;

console.log(JSON.stringify({monthFieldChecks: checks, syntheticOnly: true, ocrExecuted: false}));
