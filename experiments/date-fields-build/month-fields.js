import DateFormat from '../../date-format-v1.js';

// Reuse the app's locale-aware month vocabulary and calendar validation.
// Compact MDY accepts a four-digit year. A two-digit year always needs review.
const word = '[\\p{L}]{3,12}';
const separator = '[\\s,./-]+';
const optionalSeparator = '[\\s,./-]*';
const monthCache = new Map();

function monthNumber(name) {
  const normalized = name.toUpperCase();
  if (!monthCache.has(normalized)) {
    const parsed = DateFormat.wordDates(`1 ${normalized} 2000`);
    monthCache.set(normalized, parsed.length === 1 ? Number(parsed[0].date.slice(5, 7)) : null);
  }
  return monthCache.get(normalized);
}

function bounded(text, start, end) {
  const before = text[start - 1] || '';
  const after = text[end] || '';
  if (/[\p{L}\p{N}_/:-]/u.test(before + after)) return false;
  // A malformed longer token must not become a shorter, valid date.
  if (/\.\s*\d/.test(text.slice(end, end + 5))) return false;
  return true;
}

function option(day, month, printedYear) {
  if (!month) return null;
  const shortYear = printedYear?.length === 2;
  const year = printedYear ? Number(printedYear) : null;
  const calendarYear = year === null ? 2000 : shortYear ? 2000 + year : year;
  const date = DateFormat.iso(calendarYear, month, day ?? 1);
  if (!date) return null;
  if (day === null) return { precision: 'month', month, year, date: date.slice(0, 7) };
  if (year === null) return { precision: 'day_month', day, month };
  if (shortYear) return { precision: 'day', day, month, yearSuffix: printedYear };
  return { precision: 'day', day, month, year, date };
}

export function monthFields(text) {
  const result = [];
  const spans = [];
  const add = (start, printed, value, knownMonth = true) => {
    const end = start + printed.length;
    if (!knownMonth) return;
    spans.push({ start, end });
    if (!value || !bounded(text, start, end)) return;
    if (result.some(field => start < field.end && end > field.start)) return;
    result.push({
      kind: 'date', printed, start, end, options: [value], suffix: null,
      needsYear: value.year === undefined, needsFormat: false, needsSuffixReview: false,
    });
  };

  for (const parsed of DateFormat.wordDates(text)) {
    const [year, month, day] = parsed.date.split('-').map(Number);
    add(parsed.index, parsed.raw, { precision: 'day', day, month, year, date: parsed.date });
  }

  // SEP142020 or SEP12020. Do not interpret SEP2020 as day 20 / year 20.
  for (const match of text.matchAll(new RegExp(`(${word})(\\d{1,2})((?:19|20)\\d{2})(?!\\d)`, 'giu'))) {
    add(match.index, match[0], option(Number(match[2]), monthNumber(match[1]), match[3]), monthNumber(match[1]));
  }

  // 12OCT21 or 12 OCT 2021. Keep the printed year suffix until confirmation.
  const dmy = new RegExp(`(\\d{1,2})${optionalSeparator}(${word})${optionalSeparator}((?:19|20)\\d{2}|\\d{2})(?!\\d)`, 'giu');
  for (const match of text.matchAll(dmy)) {
    add(match.index, match[0], option(Number(match[1]), monthNumber(match[2]), match[3]), monthNumber(match[2]));
  }

  const spacedMdy = new RegExp(`(${word})${optionalSeparator}(\\d{1,2})${separator}((?:19|20)\\d{2}|\\d{2})(?!\\d)`, 'giu');
  for (const match of text.matchAll(spacedMdy)) {
    add(match.index, match[0], option(Number(match[2]), monthNumber(match[1]), match[3]), monthNumber(match[1]));
  }

  // A named month and four-digit year retain month precision.
  const monthYear = new RegExp(`(${word})${optionalSeparator}((?:19|20)\\d{2})(?!\\d)`, 'giu');
  for (const match of text.matchAll(monthYear)) {
    add(match.index, match[0], option(null, monthNumber(match[1]), match[2]), monthNumber(match[1]));
  }

  // Missing years remain missing. Require an expiry role later in agree().
  const partialPatterns = [
    [new RegExp(`(\\d{1,2})${optionalSeparator}(${word})`, 'giu'), false],
    [new RegExp(`(${word})${optionalSeparator}(\\d{1,2})(?!\\d)`, 'giu'), true],
  ];
  for (const [pattern, monthFirst] of partialPatterns) {
    for (const match of text.matchAll(pattern)) {
      const name = match[monthFirst ? 1 : 2];
      const day = Number(match[monthFirst ? 2 : 1]);
      const tail = text.slice(match.index + match[0].length);
      if (/^[\s,./-]*\d/.test(tail)) continue;
      add(match.index, match[0], option(day, monthNumber(name)), monthNumber(name));
    }
  }
  return { dates: result.sort((a, b) => a.start - b.start), spans };
}
