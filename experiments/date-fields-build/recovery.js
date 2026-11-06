// Late recovery uses the same two recognizers and unchanged agreement gates.
export function insetRows(image, fraction = .1) {
  const cut = Math.round(image.height * fraction), height = image.height - cut * 2;
  if (cut < 1 || height < 8) return null;
  return {data: new Uint8ClampedArray(image.data.slice(cut * image.width * 4, (cut + height) * image.width * 4)), width: image.width, height};
}
export function matchingRecovery(first, second, proposal) {
  if (!first?.choices?.length || !second?.choices?.length || JSON.stringify(first.choices) !== JSON.stringify(proposal)) return false;
  const keys = ['choices', 'needsYear', 'needsFormat', 'needsSuffixReview', 'needsRole', 'needsStructureReview', 'structureSupport'];
  return keys.every(key => JSON.stringify(first[key]) === JSON.stringify(second[key]));
}
