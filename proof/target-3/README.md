# toolkit

A small utility library in three areas:

- **text:** CSV (`src/csv.js`) and wrapping (`src/wrap.js`)
- **time:** intervals (`src/intervals.js`) and recurring dates (`src/recur.js`)
- **query:** a filter language (`src/filter.js`) and sorting and grouping records (`src/table.js`)

The JSDoc on each function is its spec. Some functions are unfinished and some have bugs.

Run the tests with `node --test`, or one area with `node --test test/text.test.js`. They check only part of the spec. No dependencies; needs Node 22.
