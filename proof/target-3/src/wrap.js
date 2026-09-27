/**
 * Wrap text so that no line is longer than `width` characters.
 * - Each line of the input (split on \n) is wrapped on its own. An input line that is empty or
 *   holds only spaces becomes one empty line.
 * - Words are separated by runs of spaces. On an output line, words are joined by one space, with
 *   no spaces at the start or end.
 * - Words are placed greedily: a word goes on the current line if it fits, otherwise it starts a
 *   new line.
 * - A word longer than `width` is cut into pieces of exactly `width` characters (the last piece may
 *   be shorter), and each piece is placed as a word.
 * - Throws a RangeError if width is not a positive integer.
 * @param {string} text
 * @param {number} width
 * @returns {string} the lines, joined with \n
 */
export function wrapText(text, width) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = (cur + ' ' + w).trim();
    if (next.length > width) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  lines.push(cur);
  return lines.join('\n');
}

/**
 * Shorten text to at most `max` characters, marking the cut with "…" (one character).
 * - Text of length max or less is returned unchanged.
 * - Otherwise the result is a prefix of the text followed by "…". The prefix is the text up to the
 *   last space within its first max - 1 characters, if that space is at index Math.floor(max / 2)
 *   or later; otherwise it is the first max - 1 characters. Spaces at the end of the prefix are
 *   removed.
 * - Throws a RangeError if max is not a positive integer.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function truncate(text, max) {
  throw new Error('not implemented');
}
