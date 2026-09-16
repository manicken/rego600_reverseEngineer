'use strict';
const { evalExpr } = require('./asm51.js');

// Klassificerar en operand-sträng till en typ + rådata. Slår INTE upp
// symbolvärden här — det görs senare (i resolveValue) när adresser är kända.
function classify(raw) {
  const t = raw.trim();
  const up = t.toUpperCase();

  if (up === 'A') return { type: 'A' };
  if (up === 'C') return { type: 'C' };
  if (up === 'AB') return { type: 'AB' };
  if (up === 'DPTR') return { type: 'DPTR' };
  if (up === '@DPTR') return { type: '@DPTR' };
  if (up === '@A+DPTR') return { type: '@A+DPTR' };
  if (up === '@A+PC') return { type: '@A+PC' };

  let m;
  if ((m = /^R([0-7])$/.exec(up))) return { type: 'Rn', n: Number(m[1]) };
  if ((m = /^@R([01])$/.exec(up))) return { type: '@Ri', n: Number(m[1]) };

  if (t.startsWith('#')) return { type: 'imm', expr: t.slice(1) };
  if (t.startsWith('/')) return { type: 'bit_n', expr: t.slice(1) };

  // Allt annat: en direct- eller bit-adress, uttryckt som tal, SFR-namn,
  // bit-namn eller EQU/label-symbol. Vilken av de två det är avgörs av
  // vilken instruktion som använder den (se instructions.js).
  return { type: 'direct_or_bit', expr: t };
}

// Slår upp/utvärderar ett uttryck (siffra, EQU/label-symbol, SFR- eller
// bit-namn från de enkla listorna i asm51.js, eller ett + - * / -uttryck).
function resolveValue(expr, symbols, lineNo, lineText) {
  return evalExpr(expr, symbols, lineNo, lineText);
}

module.exports = { classify, resolveValue };
