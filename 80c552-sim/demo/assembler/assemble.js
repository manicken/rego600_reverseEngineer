'use strict';
const { AsmError, tokenizeLines, evalExpr, SFR, BIT_NAMES } = require('./asm51.js');
const { build } = require('./instructions.js');
const O = require('./opcodes.js');

// Är detta en generisk "JMP label" / "CALL label" (storleken avgörs
// automatiskt) och inte den riktiga instruktionen "JMP @A+DPTR"?
function isGenericJmpCall(rec) {
  if (!rec.op) return false;
  const op = rec.op.toUpperCase();
  if (op === 'CALL') return true;
  if (op === 'JMP') return !(rec.args.length === 1 && rec.args[0].trim().toUpperCase() === '@A+DPTR');
  return false;
}

// Antal bytes ett DB/DW-direktiv tar, utan att behöva räkna ut några
// symbolvärden (så att adresser kan beräknas innan alla labels är kända).
function dbByteCount(args) {
  let n = 0;
  for (const raw of args) {
    const t = raw.trim();
    if ((t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
        (t.startsWith("'") && t.endsWith("'") && t.length >= 2 && t.length !== 3)) {
      n += t.slice(1, -1).length;
    } else {
      n += 1;
    }
  }
  return n;
}
function dwByteCount(args) { return args.length * 2; }

function newSymbolTable() {
  const symbols = new Map();
  for (const [k, v] of Object.entries(SFR)) symbols.set(k, v);
  for (const [k, v] of Object.entries(BIT_NAMES)) symbols.set(k, v);
  return symbols;
}

// Bygger en fullständig adresstabell för alla rader, givet nuvarande
// (eventuellt preliminära) storlekar på de generiska JMP/CALL-raderna.
// Returnerar { addresses, symbols } — symbols innehåller EN label direkt
// när den passeras, så efter loopen är HELA symboltabellen komplett
// (även framåtreferenser), redo att användas för att välja hoppform.
function layout(records, sizes) {
  const symbols = newSymbolTable();
  const addresses = new Array(records.length);
  let lc = 0;
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    addresses[i] = lc;
    symbols.set('$', lc);
    if (rec.label) symbols.set(rec.label.toUpperCase(), lc);
    if (!rec.op) continue;
    const op = rec.op.toUpperCase();

    if (op === 'ORG') { lc = evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw); addresses[i] = lc; symbols.set('$', lc); continue; }
    if (op === 'EQU') {
      if (!rec.label) throw new AsmError('EQU kräver ett namn: "NAMN EQU värde"', rec.lineNo, rec.raw);
      symbols.set(rec.label.toUpperCase(), evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw));
      continue;
    }
    if (op === 'END') break;
    if (op === 'DB') { lc += dbByteCount(rec.args); continue; }
    if (op === 'DW') { lc += dwByteCount(rec.args); continue; }
    if (op === 'DS') { lc += evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw); continue; }
    if (isGenericJmpCall(rec)) { lc += sizes[i]; continue; }

    // vanlig instruktion — storleken beror bara på mnemonic + operandtyper
    const desc = build(op, rec.args, rec.lineNo, rec.raw);
    lc += desc.size;
  }
  return { addresses, symbols };
}

// Kör hela texten genom assemblern.
// Returnerar { bytes: Map<addr,byte>, symbols, listing } eller kastar AsmError.
function assemble(text) {
  const records = tokenizeLines(text);

  // Generiska JMP/CALL börjar i "värsta läge" (3 byte = LJMP/LCALL) och
  // krymps sedan iterativt tills inget mer ändras (assembler relaxation).
  const sizes = new Array(records.length).fill(0);
  for (let i = 0; i < records.length; i++) if (isGenericJmpCall(records[i])) sizes[i] = 3;

  let addresses, symbols;
  const MAX_ITER = 12;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    ({ addresses, symbols } = layout(records, sizes));
    let changed = false;
    for (let i = 0; i < records.length; i++) {
      if (!isGenericJmpCall(records[i])) continue;
      const rec = records[i];
      const isCall = rec.op.toUpperCase() === 'CALL';
      const targetAddr = evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw);
      const choice = O.chooseJumpForm(targetAddr, addresses[i], isCall);
      if (choice.size !== sizes[i]) { sizes[i] = choice.size; changed = true; }
    }
    if (!changed) break;
  }

  // Slutgiltig pass: skriv faktiska bytes med den nu stabila adresstabellen.
  const bytes = new Map();
  const listing = [];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const lc = addresses[i];
    symbols.set('$', lc);
    if (!rec.op) { listing.push({ addr: lc, outBytes: [], rec }); continue; }
    const op = rec.op.toUpperCase();

    if (op === 'ORG' || op === 'EQU') { listing.push({ addr: lc, outBytes: [], rec }); continue; }
    if (op === 'END') { listing.push({ addr: lc, outBytes: [], rec }); break; }
    if (op === 'DB') {
      const bs = [];
      for (const raw of rec.args) {
        const t = raw.trim();
        if ((t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
            (t.startsWith("'") && t.endsWith("'") && t.length >= 2 && t.length !== 3)) {
          const str = t.slice(1, -1);
          for (let k = 0; k < str.length; k++) bs.push(str.charCodeAt(k) & 0xFF);
        } else {
          const v = evalExpr(t, symbols, rec.lineNo, rec.raw);
          if (v < -128 || v > 255) throw new AsmError(`DB-värde ${v} får inte plats i en byte`, rec.lineNo, rec.raw);
          bs.push(v & 0xFF);
        }
      }
      bs.forEach((b, k) => bytes.set(lc + k, b));
      listing.push({ addr: lc, outBytes: bs, rec });
      continue;
    }
    if (op === 'DW') {
      const bs = [];
      for (const raw of rec.args) {
        const v = evalExpr(raw.trim(), symbols, rec.lineNo, rec.raw);
        if (v < 0 || v > 0xFFFF) throw new AsmError(`DW-värde ${v} får inte plats i 16 bitar`, rec.lineNo, rec.raw);
        bs.push((v >> 8) & 0xFF, v & 0xFF);
      }
      bs.forEach((b, k) => bytes.set(lc + k, b));
      listing.push({ addr: lc, outBytes: bs, rec });
      continue;
    }
    if (op === 'DS') { listing.push({ addr: lc, outBytes: [], rec }); continue; }

    let concreteOp = op;
    if (isGenericJmpCall(rec)) {
      const isCall = op === 'CALL';
      const targetAddr = evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw);
      concreteOp = O.chooseJumpForm(targetAddr, lc, isCall).form;
    }

    const desc = build(concreteOp, rec.args, rec.lineNo, rec.raw);
    const ctx = { addr: lc, symbols, lineNo: rec.lineNo, lineText: rec.raw };
    const outBytes = desc.emit(ctx).map(b => b & 0xFF);
    outBytes.forEach((b, k) => bytes.set(lc + k, b));
    listing.push({ addr: lc, outBytes, rec, concreteOp: concreteOp !== op ? concreteOp : null });
  }

  return { bytes, symbols, listing };
}

module.exports = { assemble };
