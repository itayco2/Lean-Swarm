/**
 * Parse CSV text into rows of string fields.
 * - Fields are separated by `delimiter` (one character, default ",").
 * - A field may be wrapped in double quotes. Inside quotes, the delimiter, CR and LF are ordinary
 *   characters, and two quotes in a row ("") stand for one quote.
 * - A quote inside a field that did not start with a quote is an ordinary character.
 * - Rows end with LF or CRLF. A line break at the very end of the text does not start another row.
 * - A blank line inside the text is a row with one empty field: [''].
 * - '' returns [].
 * - Throws an Error whose message contains "unterminated" if the text ends inside a quoted field.
 * @param {string} text
 * @param {{ delimiter?: string }} [options]
 * @returns {string[][]}
 */
export function parseCsv(text, { delimiter = ',' } = {}) {
  if (text === '') return [];
  return text.split(/\r?\n/).map(line => line.split(delimiter));
}

/**
 * Turn rows into CSV text.
 * - A field that contains the delimiter, a quote, CR or LF is wrapped in quotes, with each quote
 *   doubled. Other fields are written as they are.
 * - Numbers and booleans are written with String(value). null and undefined become empty fields.
 * - Rows are joined with CRLF. The text does not end with a line break. [] gives ''.
 * @param {Array<Array<string | number | boolean | null | undefined>>} rows
 * @param {{ delimiter?: string }} [options]
 * @returns {string}
 */
export function toCsv(rows, { delimiter = ',' } = {}) {
  throw new Error('not implemented');
}

/**
 * Parse CSV whose first row is a header into objects keyed by the header names.
 * - Header names are trimmed of spaces at both ends. Values are not trimmed.
 * - A row with fewer fields than the header gets '' for each missing field.
 * - Throws an Error whose message contains the row number if a row has more fields than the header
 *   (row 1 is the first row after the header).
 * - Throws an Error whose message contains "duplicate" if two header names are equal after trimming.
 * - '' and a header with no rows both return [].
 * - Takes the same options as parseCsv.
 * @param {string} text
 * @param {{ delimiter?: string }} [options]
 * @returns {Array<Record<string, string>>}
 */
export function parseCsvObjects(text, options) {
  const [header, ...rows] = parseCsv(text, options);
  if (!header) return [];
  return rows.map(r => Object.fromEntries(header.map((name, j) => [name, r[j]])));
}
