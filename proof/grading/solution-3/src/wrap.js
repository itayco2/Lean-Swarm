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
  if (!Number.isInteger(width) || width < 1) throw new RangeError('width must be a positive integer');
  return text.split('\n').map(line => {
    const words = line.split(/ +/).filter(Boolean).flatMap(w => {
      const pieces = [];
      for (let i = 0; i < w.length; i += width) pieces.push(w.slice(i, i + width));
      return pieces;
    });
    const out = [];
    let cur = '';
    for (const w of words) {
      if (cur === '') cur = w;
      else if (cur.length + 1 + w.length <= width) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    }
    if (cur !== '') out.push(cur);
    return out.join('\n');
  }).join('\n');
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
  if (!Number.isInteger(max) || max < 1) throw new RangeError('max must be a positive integer');
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1);
  const space = room.lastIndexOf(' ');
  const prefix = space >= Math.floor(max / 2) ? room.slice(0, space) : room;
  return prefix.replace(/ +$/, '') + '…';
}
