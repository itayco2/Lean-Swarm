/**
 * Compile a filter expression into a function that takes a record and returns true or false.
 *
 * Grammar (spaces, tabs and line breaks between tokens are ignored):
 *   expr    := and ( OR and )*
 *   and     := unary ( AND unary )*
 *   unary   := NOT unary | "(" expr ")" | compare
 *   compare := field op value
 *   op      := "=" | "!=" | "<" | "<=" | ">" | ">=" | CONTAINS
 *   value   := number | string | TRUE | FALSE | NULL
 *   number  := an optional "-", digits, then optionally "." and more digits: 3, -2, 0.5
 *   string  := text in single quotes; inside it, \' stands for a quote and \\ for a backslash
 *   field   := a name of letters, digits and _ that does not start with a digit, optionally
 *              followed by more names after dots; a.b reads record.a.b
 * The keywords AND, OR, NOT, CONTAINS, TRUE, FALSE and NULL are case-insensitive and are never
 * field names.
 *
 * Meaning:
 * - A missing field, or a path that runs into a missing, null or undefined value, reads as
 *   undefined.
 * - = and != use strict equality, except that `= null` is also true for undefined, and `!= null`
 *   is false for undefined.
 * - <, <=, >, >= compare two numbers, or two strings by UTF-16 code units. For any other pair of
 *   types they are false.
 * - CONTAINS is true if the field is a string and the value is a string it contains, or if the
 *   field is an array that includes the value (strict equality). Otherwise it is false.
 * - NOT binds tighter than AND, and AND binds tighter than OR.
 *
 * Errors: throws a SyntaxError whose message contains the 0-based index, in the expression, of the
 * first character of the token where parsing failed. The end of the expression has index
 * expression.length. An unterminated string fails at its opening quote.
 * @param {string} expression
 * @returns {(record: object) => boolean}
 */
export function compileFilter(expression) {
  const tokens = tokenize(expression);
  let k = 0;
  const peek = () => tokens[k];
  const fail = t => {
    throw new SyntaxError(`unexpected ${t.type === 'end' ? 'end of expression' : `"${t.text}"`} at index ${t.pos}`);
  };
  const expect = type => {
    const t = tokens[k];
    if (t.type !== type) fail(t);
    k++;
    return t;
  };

  function parseOr() {
    let left = parseAnd();
    while (peek().type === 'or') {
      k++;
      const l = left, r = parseAnd();
      left = rec => l(rec) || r(rec);
    }
    return left;
  }
  function parseAnd() {
    let left = parseUnary();
    while (peek().type === 'and') {
      k++;
      const l = left, r = parseUnary();
      left = rec => l(rec) && r(rec);
    }
    return left;
  }
  function parseUnary() {
    const t = peek();
    if (t.type === 'not') { k++; const inner = parseUnary(); return rec => !inner(rec); }
    if (t.type === '(') { k++; const inner = parseOr(); expect(')'); return inner; }
    return parseCompare();
  }
  function parseCompare() {
    const path = expect('field').value;
    const opTok = peek();
    if (opTok.type !== 'op' && opTok.type !== 'contains') fail(opTok);
    k++;
    const op = opTok.type === 'contains' ? 'contains' : opTok.value;
    const value = expect('value').value;
    const read = rec => path.reduce((o, p) => (o === null || o === undefined ? undefined : o[p]), rec);
    return rec => compare(read(rec), op, value);
  }

  const fn = parseOr();
  expect('end');
  return rec => Boolean(fn(rec));
}

const KEYWORDS = { and: 'and', or: 'or', not: 'not', contains: 'contains' };
const LITERALS = { true: true, false: false, null: null };

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const pos = i;
    const rest = src.slice(i);
    if (c === '(' || c === ')') { tokens.push({ type: c, text: c, pos }); i++; continue; }
    const op = /^(!=|<=|>=|=|<|>)/.exec(rest);
    if (op) { tokens.push({ type: 'op', value: op[1], text: op[1], pos }); i += op[1].length; continue; }
    if (c === "'") {
      let s = '';
      i++;
      while (i < src.length && src[i] !== "'") {
        if (src[i] === '\\' && (src[i + 1] === "'" || src[i + 1] === '\\')) { s += src[i + 1]; i += 2; } else { s += src[i]; i++; }
      }
      if (i >= src.length) throw new SyntaxError(`unterminated string starting at index ${pos}`);
      i++;
      tokens.push({ type: 'value', value: s, text: src.slice(pos, i), pos });
      continue;
    }
    const num = /^-?\d+(\.\d+)?/.exec(rest);
    if (num) { tokens.push({ type: 'value', value: Number(num[0]), text: num[0], pos }); i += num[0].length; continue; }
    const word = /^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*/.exec(rest);
    if (word) {
      const lower = word[0].toLowerCase();
      if (lower in KEYWORDS) tokens.push({ type: KEYWORDS[lower], text: word[0], pos });
      else if (lower in LITERALS) tokens.push({ type: 'value', value: LITERALS[lower], text: word[0], pos });
      else tokens.push({ type: 'field', value: word[0].split('.'), text: word[0], pos });
      i += word[0].length;
      continue;
    }
    throw new SyntaxError(`unexpected character "${c}" at index ${pos}`);
  }
  tokens.push({ type: 'end', text: '', pos: src.length });
  return tokens;
}

function compare(a, op, v) {
  switch (op) {
    case '=': return v === null ? a === null || a === undefined : a === v;
    case '!=': return v === null ? !(a === null || a === undefined) : a !== v;
    case 'contains':
      if (typeof a === 'string') return typeof v === 'string' && a.includes(v);
      if (Array.isArray(a)) return a.includes(v);
      return false;
    default: {
      const comparable = (typeof a === 'number' && typeof v === 'number') || (typeof a === 'string' && typeof v === 'string');
      if (!comparable) return false;
      if (op === '<') return a < v;
      if (op === '<=') return a <= v;
      if (op === '>') return a > v;
      return a >= v;
    }
  }
}
