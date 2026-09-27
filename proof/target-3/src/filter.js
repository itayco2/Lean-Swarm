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
  throw new Error('not implemented');
}
