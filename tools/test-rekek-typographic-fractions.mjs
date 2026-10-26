import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('personal-recipe-parser-v1.js', 'utf8'), context);
const parser = context.window.RESERVE_RECIPE_PARSER, rekek = context.window.RESERVE_REKEK;
for (const [raw, canonical, amount] of [
  ['¹/₄ TL Salz', '1/4 TL Salz', .25], ['¹⁄₄ TL Salz', '1/4 TL Salz', .25],
  ['¹∕₄ TL Salz', '1/4 TL Salz', .25], ['1/₄ TL Salz', '1/4 TL Salz', .25],
  ['¹/4 TL Salz', '1/4 TL Salz', .25], ['¹²/₁₆ TL Salz', '12/16 TL Salz', .75],
  ['2³/₄ TL Salz', '2 3/4 TL Salz', 2.75], ['1 ¹ / ₂ TL Salz', '1 1/2 TL Salz', 1.5],
  ['₂/₃ l Wasser', '2/3 l Wasser', 2000/3]
]) {
  const parsed = parser.ingredient(raw);
  assert.equal(rekek.expandFractions(raw), canonical, raw);
  assert.ok(Math.abs(parsed.amount - amount) < 1e-9, raw);
  assert.equal(parsed.raw, raw);
  assert.equal(parser.pantryIngredient(raw).uncertain, false, raw);
}
for (const raw of ['¹ Frischkäse', '² TL Salz', '₄ g Mehl', '¹ / TL Salz', '⁻¹/₂ TL Salz',
  '¹/₀ TL Salz', '¹/₂/₃ TL Salz', '¹/₂–³/₄ TL Salz', '¹/₂ Mehl', '¹/₂ TL']) {
  assert.equal(parser.pantryIngredient(raw).uncertain, true, raw);
}
for (const raw of ['H₂O', 'Vitamin B₁₂', '10⁻³ g', '²⁰²⁶', '¹ Frischkäse']) assert.equal(rekek.expandFractions(raw), raw);
assert.equal(parser.ingredient('12.5 g Mehl').amount, 12.5); // Do not repair the model's 125→12.5 reading.
for (const heading of ['', 'Zutaten\n']) {
  const draft = parser.parseText(`Suppe\n${heading}¹/₄ TL Salz\n100 g Mehl\nZubereitung\nVermischen.`);
  assert.equal(draft.name, 'Suppe'); assert.equal(draft.ingredients, '¹/₄ TL Salz\n100 g Mehl');
  assert.equal(draft.steps, 'Vermischen.');
}
const split = parser.parseText('Suppe\nZutaten\n¹/₄\nTL\nSalz\nZubereitung\nVermischen.');
assert.equal(split.ingredients, '¹/₄ TL Salz');
const read = rekek.reviewIngredientReadings(['¹/₄ TL Salz', '¼ TL Salz']);
assert.equal(read.agreement, true); assert.equal(read.quantityClear, true);
assert.deepEqual(Array.from(read.reads), ['¹/₄ TL Salz', '¼ TL Salz']);
assert.equal(rekek.reviewIngredientReadings(['¹/₄ TL Salz', '¹/₂ TL Salz']).quantityClear, false);
const known = parser.parseText('¹/₄ Teelöffel Salz\nZutaten\n100 g Mehl');
assert.equal(known.name, '');
console.log('Explicit raised/lowered slash fractions, mixed typography, raw source preservation, split rows, reader agreement and ambiguous/exponent/zero-denominator guards passed. Parser compatibility only; no OCR accuracy claim.');
