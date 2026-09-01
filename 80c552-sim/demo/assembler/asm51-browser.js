/*!
 * asm51-browser.js — hopslagen webbläsarversion av asm51.
 * Genererad av build-browser.js från Node-källfilerna (asm51.js,
 * operand.js, opcodes.js, instructions.js, assemble.js). Redigera
 * KÄLLFILERNA och kör "node build-browser.js" igen för att uppdatera
 * denna fil — redigera inte asm51-browser.js direkt om du har Node kvar.
 *
 * Användning i webbsidan:
 *   <script src="assembler/asm51-browser.js"></script>
 *   <script>
 *     const result = ASM51.assemble(sourceText);
 *     // result.bytes   -> Map<adress, byte>
 *     // result.symbols -> Map<NAMN, värde>
 *     // result.listing -> [{addr, outBytes, rec, concreteOp}, ...]
 *     // Fel kastas som ASM51.AsmError med .lineNo och .message
 *   </script>
 */
(function (global) {
  'use strict';

/*
 * asm51.js — Litet tvåpass-assemblerprogram för 8051/8xC552.
 *
 * Löser automatiskt relativa hopp och symboler (labels) så att du
 * slipper räkna om offsets för hand när koden ändras. Stödjer generiska
 * "JMP label" / "CALL label" som automatiskt väljer kortaste möjliga
 * instruktion (SJMP/AJMP/LJMP respektive ACALL/LCALL) via en klassisk
 * "assembler relaxation"-loop, plus alla vanliga fasta mnemonics
 * (SJMP/AJMP/LJMP/ACALL/LCALL) om du hellre vill styra det själv.
 *
 * Användning:
 *   node asm51.js program.asm -o program.hex          (Intel HEX, default)
 *   node asm51.js program.asm --bin -o program.bin     (rå binärfil)
 *   node asm51.js program.asm --list -o program.lst    (assembler-listing)
 *   node asm51.js program.asm --js   -o program.js     (JS-array, för att
 *                                                        klistra rakt in i
 *                                                        en JS-simulator)
 *   Flera format kan kombineras genom att köra flera gånger, eller ange
 *   --hex --bin --list --js samtidigt (skriver <out>.hex/.bin/.lst/.js).
 */



//------------------------------------------------------------------
// Fel-hantering
//------------------------------------------------------------------
class AsmError extends Error {
  constructor(msg, lineNo, lineText) {
    super(msg);
    this.lineNo = lineNo;
    this.lineText = lineText;
  }
}

//------------------------------------------------------------------
// Kända SFR- och bit-namn — bara enkla listor (namn -> adress).
// Redigera/utöka fritt här om din chip-variant har andra SFR:er.
// Du kan alltid skriva rått nummer istället, eller lägga till egna
// namn med EQU i själva källkoden.
//------------------------------------------------------------------
const SFR = {
  P0: 0x80, SP: 0x81, DPL: 0x82, DPH: 0x83, PCON: 0x87,
  TCON: 0x88, TMOD: 0x89, TL0: 0x8A, TL1: 0x8B, TH0: 0x8C, TH1: 0x8D,
  P1: 0x90, SCON: 0x98,S0CON: 0x98, SBUF: 0x99, S0BUF: 0x99,
  P2: 0xA0, IE: 0xA8,
  P3: 0xB0, IP: 0xB8,
  PSW: 0xD0, ACC: 0xE0, B: 0xF0,
  // 80C552-tillägg — justera adresserna om din variant skiljer sig
  P4: 0xC0, P5: 0xC4, ADCON: 0xC5, ADCH: 0xC6,
  S1CON: 0xC8, S1STA: 0xC9, S1DAT: 0xCA, S1ADR: 0xCB,
};

// Namngivna bit-adresser, t.ex. för JB/JNB/SETB/CLR/CPL på enskilda flaggor.
// Lägg till fler rader efter samma mönster (NAMN: adress) vid behov.
const BIT_NAMES = {
  // PSW
  CY: 0xD7, AC: 0xD6, F0: 0xD5, RS1: 0xD4, RS0: 0xD3, OV: 0xD2, P: 0xD0,
  // IE
  EA: 0xAF, ES: 0xAC, ET1: 0xAB, EX1: 0xAA, ET0: 0xA9, EX0: 0xA8,
  // IP
  PS: 0xBC, PT1: 0xBB, PX1: 0xBA, PT0: 0xB9, PX0: 0xB8,
  // TCON
  TF1: 0x8F, TR1: 0x8E, TF0: 0x8D, TR0: 0x8C, IE1: 0x8B, IT1: 0x8A, IE0: 0x89, IT0: 0x88,
  // SCON
  SM0: 0x9F, SM1: 0x9E, SM2: 0x9D, REN: 0x9C, TB8: 0x9B, RB8: 0x9A, TI: 0x99, RI: 0x98, "S0CON.1": 0x99, "S0CON.0":0x98,
  // vanliga individuella portpinnar — lägg till fler P0.x/P2.x/P3.x vid behov
  P1_0: 0x90, P1_1: 0x91, P1_2: 0x92, P1_3: 0x93, P1_4: 0x94, P1_5: 0x95, P1_6: 0x96, P1_7: 0x97,
};

//------------------------------------------------------------------
// Tokenizer: läs in rader, dela upp i {label, op, argsRaw, lineNo, raw}
//------------------------------------------------------------------
function stripComment(line) {
  // ';' inleder kommentar, men respektera strängar/teckenlitteraler
  let inStr = false, strCh = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === strCh) inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true; strCh = c;
    } else if (c === ';') {
      return line.slice(0, i);
    }
  }
  return line;
}

function splitArgs(s) {
  // dela på ',' men inte inuti strängar
  const out = [];
  let cur = '', inStr = false, strCh = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      cur += c;
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; cur += c; continue; }
    if (c === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim().length || out.length) out.push(cur.trim());
  return out.filter(x => x.length > 0);
}

function tokenizeLines(text) {
  const rawLines = text.split(/\r\n|\r|\n/);
  const records = [];
  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1;
    let line = stripComment(rawLines[i]);
    if (!line.trim()) continue;

    let label = null;
    // label: identifierare direkt följd av ':'
    const labelMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (labelMatch) {
      label = labelMatch[1];
      line = labelMatch[2];
    } else {
      // "NAMN EQU värde" — EQU tillåter ett namn utan kolon, klassisk syntax
      const equMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s+(EQU)\s+(.*)$/i.exec(line);
      if (equMatch) {
        label = equMatch[1];
        line = equMatch[2] + ' ' + equMatch[3];
      }
    }
    line = line.trim();

    if (!line.length) {
      if (label) records.push({ lineNo, raw: rawLines[i], label, op: null, args: [] });
      continue;
    }

    const opMatch = /^(\S+)\s*(.*)$/.exec(line);
    const op = opMatch[1];
    const argsRaw = opMatch[2] || '';
    const args = splitArgs(argsRaw);
    records.push({ lineNo, raw: rawLines[i], label, op, args });
  }
  return records;
}

//------------------------------------------------------------------
// Uttrycksutvärderare: tal (dec, 0xHEX, HEXh, 0bBIN, BINb, 'c'),
// symboler, + - * / , HIGH()/LOW(), parenteser, unärt -.
//------------------------------------------------------------------
function evalExpr(str, symbols, lineNo, lineText) {
  let s = str.trim();
  let pos = 0;

  function peek() { return s[pos]; }
  function fail(msg) { throw new AsmError(`Uttrycksfel "${str}": ${msg}`, lineNo, lineText); }

  function skipWs() { while (pos < s.length && /\s/.test(s[pos])) pos++; }

  function parsePrimary() {
    skipWs();
    if (peek() === '(') {
      pos++;
      const v = parseAdd();
      skipWs();
      if (peek() !== ')') fail('saknad ")"');
      pos++;
      return v;
    }
    if (peek() === '-') { pos++; return -parsePrimary(); }
    if (peek() === '+') { pos++; return parsePrimary(); }
    if (peek() === "'") {
      pos++;
      const ch = s[pos];
      pos++;
      if (peek() !== "'") fail("saknad avslutande '");
      pos++;
      return ch.charCodeAt(0);
    }
    // funktioner HIGH(x) / LOW(x)
    const fnMatch = /^(HIGH|LOW)\s*\(/i.exec(s.slice(pos));
    if (fnMatch) {
      const fn = fnMatch[1].toUpperCase();
      pos += fnMatch[0].length;
      const v = parseAdd();
      skipWs();
      if (peek() !== ')') fail('saknad ")" efter ' + fn);
      pos++;
      return fn === 'HIGH' ? (v >> 8) & 0xFF : v & 0xFF;
    }
    // tal: 0x.., 0b.., ..h, ..b, decimal
    const numMatch = /^(0x[0-9A-Fa-f]+|0b[01]+|[0-9][0-9A-Fa-f]*[Hh]\b|[0-9]+[Bb]\b|[0-9]+)/.exec(s.slice(pos));
    if (numMatch) {
      let tok = numMatch[0];
      pos += tok.length;
      if (/^0x/i.test(tok)) return parseInt(tok.slice(2), 16);
      if (/^0b/i.test(tok)) return parseInt(tok.slice(2), 2);
      if (/[Hh]$/.test(tok)) return parseInt(tok.slice(0, -1), 16);
      if (/[Bb]$/.test(tok) && /^[01]+[Bb]$/.test(tok)) return parseInt(tok.slice(0, -1), 2);
      return parseInt(tok, 10);
    }
    // symbol / '$' (nuvarande adress)
    if (peek() === '$') { pos++; return symbols.get('$'); }
    const idMatch = /^[A-Za-z_.][A-Za-z0-9_.]*/.exec(s.slice(pos));
    if (idMatch) {
      const name = idMatch[0];
      pos += name.length;
      const up = name.toUpperCase();
      if (symbols.has(up)) return symbols.get(up);
      if (SFR[up] !== undefined) return SFR[up];
      if (BIT_NAMES[up] !== undefined) return BIT_NAMES[up];
      fail(`okänd symbol "${name}"`);
    }
    fail(`kunde inte tolka "${s.slice(pos)}"`);
  }

  function parseMulDiv() {
    let v = parsePrimary();
    for (;;) {
      skipWs();
      if (peek() === '*') { pos++; v = v * parsePrimary(); }
      else if (peek() === '/') { pos++; v = Math.trunc(v / parsePrimary()); }
      else break;
    }
    return v;
  }

  function parseAdd() {
    let v = parseMulDiv();
    for (;;) {
      skipWs();
      if (peek() === '+') { pos++; v = v + parseMulDiv(); }
      else if (peek() === '-') { pos++; v = v - parseMulDiv(); }
      else break;
    }
    return v;
  }

  const result = parseAdd();
  skipWs();
  if (pos < s.length) fail(`oväntat tecken "${s.slice(pos)}"`);
  return result;
}

  //================================================================

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

  //================================================================

function err(lineNo, lineText, msg) { throw new AsmError(msg, lineNo, lineText); }

function checkByte(v, lineNo, lineText, what) {
  if (v < -128 || v > 255) err(lineNo, lineText, `${what} ${v} får inte plats i en byte`);
  return v & 0xFF;
}
function checkWord(v, lineNo, lineText, what) {
  if (v < 0 || v > 0xFFFF) err(lineNo, lineText, `${what} ${v} får inte plats i 16 bitar`);
  return v & 0xFFFF;
}

// argsClassified: array från operand.classify(). Hjälpare för att läsa ut typ.
function isA(o) { return o && o.type === 'A'; }
function isC(o) { return o && o.type === 'C'; }
function isAB(o) { return o && o.type === 'AB'; }
function isDPTR(o) { return o && o.type === 'DPTR'; }
function isAtDPTR(o) { return o && o.type === '@DPTR'; }
function isAtADPTR(o) { return o && o.type === '@A+DPTR'; }
function isAtAPC(o) { return o && o.type === '@A+PC'; }
function isRn(o) { return o && o.type === 'Rn'; }
function isRi(o) { return o && o.type === '@Ri'; }
function isImm(o) { return o && o.type === 'imm'; }
function isBitN(o) { return o && o.type === 'bit_n'; } // /bit
function isDirOrBit(o) { return o && o.type === 'direct_or_bit'; }

function immByte(o, ctx) { return checkByte(resolveValue(o.expr, ctx.symbols, ctx.lineNo, ctx.lineText), ctx.lineNo, ctx.lineText, 'immediate-värde') & 0xFF; }
function immWord(o, ctx) { return checkWord(resolveValue(o.expr, ctx.symbols, ctx.lineNo, ctx.lineText), ctx.lineNo, ctx.lineText, 'immediate-värde'); }
function directByte(o, ctx) {
  const v = resolveValue(o.expr, ctx.symbols, ctx.lineNo, ctx.lineText);
  if (v < 0 || v > 255) err(ctx.lineNo, ctx.lineText, `direct-adress ${v} utanför 0-255`);
  return v & 0xFF;
}
function bitByte(o, ctx) {
  const expr = o.type === 'bit_n' ? o.expr : o.expr;
  const v = resolveValue(expr, ctx.symbols, ctx.lineNo, ctx.lineText);
  if (v < 0 || v > 255) err(ctx.lineNo, ctx.lineText, `bit-adress ${v} utanför 0-255`);
  return v & 0xFF;
}

function rel8(targetExpr, ctx, instrSize) {
  const target = resolveValue(targetExpr, ctx.symbols, ctx.lineNo, ctx.lineText);
  const nextPc = ctx.addr + instrSize;
  const rel = target - nextPc;
  if (rel < -128 || rel > 127) {
    err(ctx.lineNo, ctx.lineText,
      `hoppet till "${targetExpr}" (0x${target.toString(16)}) är ${rel} byte bort från 0x${nextPc.toString(16)} — ` +
      `för långt för ett relativt hopp (SJMP/Jcc, max -128..+127). Använd JMP/CALL (generisk) eller LJMP/LCALL istället.`);
  }
  return rel & 0xFF;
}

function ajmpAcallBytes(targetExpr, ctx, isCall) {
  const target = resolveValue(targetExpr, ctx.symbols, ctx.lineNo, ctx.lineText);
  const nextPc = ctx.addr + 2;
  if ((target & 0xF800) !== (nextPc & 0xF800)) {
    err(ctx.lineNo, ctx.lineText,
      `målet "${targetExpr}" (0x${target.toString(16)}) ligger inte i samma 2KB-sida som 0x${nextPc.toString(16)} — ` +
      `${isCall ? 'ACALL' : 'AJMP'} kan bara hoppa inom samma sida. Använd ${isCall ? 'LCALL' : 'LJMP'} istället.`);
  }
  const page = (target >> 8) & 0x07;
  const opByte = (page << 5) | (isCall ? 0x11 : 0x01);
  return [opByte, target & 0xFF];
}

function ljmpLcallBytes(targetExpr, ctx, isCall) {
  const target = checkWord(resolveValue(targetExpr, ctx.symbols, ctx.lineNo, ctx.lineText), ctx.lineNo, ctx.lineText, 'måladress');
  return [isCall ? 0x12 : 0x02, (target >> 8) & 0xFF, target & 0xFF];
}

// Avgör vilken form (sjmp/ajmp/ljmp resp. acall/lcall) en generisk
// JMP/CALL bör kokas ner till, givet en (eventuellt preliminär) måladress.
// Används av assemble.js i relaxations-loopen.
function chooseJumpForm(targetAddr, instrAddr, isCall) {
  if (!isCall) {
    const relOk = (targetAddr - (instrAddr + 2)) >= -128 && (targetAddr - (instrAddr + 2)) <= 127;
    if (relOk) return { form: 'SJMP', size: 2 };
  }
  const pageOk = (targetAddr & 0xF800) === ((instrAddr + 2) & 0xF800);
  if (pageOk) return { form: isCall ? 'ACALL' : 'AJMP', size: 2 };
  return { form: isCall ? 'LCALL' : 'LJMP', size: 3 };
}

const O = {
  err, checkByte, checkWord,
  isA, isC, isAB, isDPTR, isAtDPTR, isAtADPTR, isAtAPC, isRn, isRi, isImm, isBitN, isDirOrBit,
  immByte, immWord, directByte, bitByte, rel8, ajmpAcallBytes, ljmpLcallBytes, chooseJumpForm,
};

  //================================================================

// descriptor = { size, emit(ctx) -> number[] }
function fixed(size, emitFn) { return { size, emit: emitFn }; }

// Bygger en instruktions-deskriptor. `op` är versal mnemonic (utan generiska
// JMP/CALL — de löses om till konkret form innan build() anropas).
// `argsRaw` är operand-strängarna som skrevs i källkoden (oklassade).
function build(op, argsRaw, lineNo, lineText) {
  const a = argsRaw.map(classify);
  const n = a.length;
  const err = (msg) => O.err(lineNo, lineText, msg);
  const bad = () => err(`ogiltiga operander för ${op}: "${argsRaw.join(', ')}"`);

  switch (op) {
    case 'NOP': if (n !== 0) bad(); return fixed(1, () => [0x00]);
    case 'RET': if (n !== 0) bad(); return fixed(1, () => [0x22]);
    case 'RETI': if (n !== 0) bad(); return fixed(1, () => [0x32]);

    case 'MOV': {
      if (n !== 2) bad();
      const [d, s] = a;
      if (O.isA(d)) {
        if (O.isRn(s)) return fixed(1, () => [0xE8 + s.n]);
        if (O.isDirOrBit(s)) return fixed(2, (ctx) => [0xE5, O.directByte(s, ctx)]);
        if (O.isRi(s)) return fixed(1, () => [0xE6 + s.n]);
        if (O.isImm(s)) return fixed(2, (ctx) => [0x74, O.immByte(s, ctx)]);
        bad();
      }
      if (O.isRn(d)) {
        if (O.isA(s)) return fixed(1, () => [0xF8 + d.n]);
        if (O.isDirOrBit(s)) return fixed(2, (ctx) => [0xA8 + d.n, O.directByte(s, ctx)]);
        if (O.isImm(s)) return fixed(2, (ctx) => [0x78 + d.n, O.immByte(s, ctx)]);
        bad();
      }
      if (O.isRi(d)) {
        if (O.isA(s)) return fixed(1, () => [0xF6 + d.n]);
        if (O.isDirOrBit(s)) return fixed(2, (ctx) => [0xA6 + d.n, O.directByte(s, ctx)]);
        if (O.isImm(s)) return fixed(2, (ctx) => [0x76 + d.n, O.immByte(s, ctx)]);
        bad();
      }
      if (O.isDPTR(d)) {
        if (O.isImm(s)) return fixed(3, (ctx) => { const w = O.immWord(s, ctx); return [0x90, (w >> 8) & 0xFF, w & 0xFF]; });
        bad();
      }
      if (O.isC(d)) {
        if (O.isDirOrBit(s)) return fixed(2, (ctx) => [0xA2, O.bitByte(s, ctx)]);
        bad();
      }
      if (O.isDirOrBit(d)) {
        if (O.isC(s)) return fixed(2, (ctx) => [0x92, O.bitByte(d, ctx)]);
        if (O.isA(s)) return fixed(2, (ctx) => [0xF5, O.directByte(d, ctx)]);
        if (O.isRn(s)) return fixed(2, (ctx) => [0x88 + s.n, O.directByte(d, ctx)]);
        if (O.isRi(s)) return fixed(2, (ctx) => [0x86 + s.n, O.directByte(d, ctx)]);
        if (O.isImm(s)) return fixed(3, (ctx) => [0x75, O.directByte(d, ctx), O.immByte(s, ctx)]);
        if (O.isDirOrBit(s)) return fixed(3, (ctx) => [0x85, O.directByte(s, ctx), O.directByte(d, ctx)]); // OBS: src,dest i bytekodningen
        bad();
      }
      bad();
    }

    case 'MOVX': {
      if (n !== 2) bad();
      const [d, s] = a;
      if (O.isA(d) && O.isAtDPTR(s)) return fixed(1, () => [0xE0]);
      if (O.isA(d) && O.isRi(s)) return fixed(1, () => [0xE2 + s.n]);
      if (O.isAtDPTR(d) && O.isA(s)) return fixed(1, () => [0xF0]);
      if (O.isRi(d) && O.isA(s)) return fixed(1, () => [0xF2 + d.n]);
      bad();
    }

    case 'MOVC': {
      if (n !== 2) bad();
      const [d, s] = a;
      if (!O.isA(d)) bad();
      if (O.isAtADPTR(s)) return fixed(1, () => [0x93]);
      if (O.isAtAPC(s)) return fixed(1, () => [0x83]);
      bad();
    }

    case 'ADD': case 'ADDC': case 'SUBB': {
      if (n !== 2 || !O.isA(a[0])) bad();
      const s = a[1];
      const base = { ADD: 0x24, ADDC: 0x34, SUBB: 0x94 }[op];
      if (O.isImm(s)) return fixed(2, (ctx) => [base, O.immByte(s, ctx)]);
      if (O.isDirOrBit(s)) return fixed(2, (ctx) => [base + 1, O.directByte(s, ctx)]);
      if (O.isRi(s)) return fixed(1, () => [base + 2 + s.n]);
      if (O.isRn(s)) return fixed(1, () => [base + 4 + s.n]);
      bad();
    }

    case 'ORL': case 'ANL': case 'XRL': {
      if (n !== 2) bad();
      const [d, s] = a;
      const baseA = { ORL: 0x44, ANL: 0x54, XRL: 0x64 }[op];
      const baseDirA = { ORL: 0x42, ANL: 0x52, XRL: 0x62 }[op];
      const baseDirImm = { ORL: 0x43, ANL: 0x53, XRL: 0x63 }[op];
      if (O.isA(d)) {
        if (O.isImm(s)) return fixed(2, (ctx) => [baseA, O.immByte(s, ctx)]);
        if (O.isDirOrBit(s)) return fixed(2, (ctx) => [baseA + 1, O.directByte(s, ctx)]);
        if (O.isRi(s)) return fixed(1, () => [baseA + 2 + s.n]);
        if (O.isRn(s)) return fixed(1, () => [baseA + 4 + s.n]);
        bad();
      }
      if (O.isDirOrBit(d)) {
        if (O.isA(s)) return fixed(2, (ctx) => [baseDirA, O.directByte(d, ctx)]);
        if (O.isImm(s)) return fixed(3, (ctx) => [baseDirImm, O.directByte(d, ctx), O.immByte(s, ctx)]);
        bad();
      }
      if (O.isC(d) && op !== 'XRL') {
        const baseCbit = op === 'ORL' ? 0x72 : 0x82;
        const baseCnbit = op === 'ORL' ? 0xA0 : 0xB0;
        if (O.isDirOrBit(s)) return fixed(2, (ctx) => [baseCbit, O.bitByte(s, ctx)]);
        if (O.isBitN(s)) return fixed(2, (ctx) => [baseCnbit, O.bitByte(s, ctx)]);
        bad();
      }
      bad();
    }

    case 'INC': {
      if (n !== 1) bad();
      const d = a[0];
      if (O.isA(d)) return fixed(1, () => [0x04]);
      if (O.isDirOrBit(d)) return fixed(2, (ctx) => [0x05, O.directByte(d, ctx)]);
      if (O.isRi(d)) return fixed(1, () => [0x06 + d.n]);
      if (O.isRn(d)) return fixed(1, () => [0x08 + d.n]);
      if (O.isDPTR(d)) return fixed(1, () => [0xA3]);
      bad();
    }
    case 'DEC': {
      if (n !== 1) bad();
      const d = a[0];
      if (O.isA(d)) return fixed(1, () => [0x14]);
      if (O.isDirOrBit(d)) return fixed(2, (ctx) => [0x15, O.directByte(d, ctx)]);
      if (O.isRi(d)) return fixed(1, () => [0x16 + d.n]);
      if (O.isRn(d)) return fixed(1, () => [0x18 + d.n]);
      bad();
    }

    case 'MUL': if (n !== 1 || !O.isAB(a[0])) bad(); return fixed(1, () => [0xA4]);
    case 'DIV': if (n !== 1 || !O.isAB(a[0])) bad(); return fixed(1, () => [0x84]);
    case 'DA': if (n !== 1 || !O.isA(a[0])) bad(); return fixed(1, () => [0xD4]);

    case 'CLR': {
      if (n !== 1) bad();
      const d = a[0];
      if (O.isA(d)) return fixed(1, () => [0xE4]);
      if (O.isC(d)) return fixed(1, () => [0xC3]);
      if (O.isDirOrBit(d)) return fixed(2, (ctx) => [0xC2, O.bitByte(d, ctx)]);
      bad();
    }
    case 'CPL': {
      if (n !== 1) bad();
      const d = a[0];
      if (O.isA(d)) return fixed(1, () => [0xF4]);
      if (O.isC(d)) return fixed(1, () => [0xB3]);
      if (O.isDirOrBit(d)) return fixed(2, (ctx) => [0xB2, O.bitByte(d, ctx)]);
      bad();
    }
    case 'SETB': {
      if (n !== 1) bad();
      const d = a[0];
      if (O.isC(d)) return fixed(1, () => [0xD3]);
      if (O.isDirOrBit(d)) return fixed(2, (ctx) => [0xD2, O.bitByte(d, ctx)]);
      bad();
    }

    case 'RR': if (n !== 1 || !O.isA(a[0])) bad(); return fixed(1, () => [0x03]);
    case 'RRC': if (n !== 1 || !O.isA(a[0])) bad(); return fixed(1, () => [0x13]);
    case 'RL': if (n !== 1 || !O.isA(a[0])) bad(); return fixed(1, () => [0x23]);
    case 'RLC': if (n !== 1 || !O.isA(a[0])) bad(); return fixed(1, () => [0x33]);
    case 'SWAP': if (n !== 1 || !O.isA(a[0])) bad(); return fixed(1, () => [0xC4]);

    case 'PUSH': {
      if (n !== 1) bad();
      if (O.isA(a[0])) return fixed(2, () => [0xC0, 0xE0]); // PUSH A = PUSH ACC
      if (O.isDirOrBit(a[0])) return fixed(2, (ctx) => [0xC0, O.directByte(a[0], ctx)]);
      bad();
    }
    case 'POP': {
      if (n !== 1) bad();
      if (O.isA(a[0])) return fixed(2, () => [0xD0, 0xE0]); // POP A = POP ACC
      if (O.isDirOrBit(a[0])) return fixed(2, (ctx) => [0xD0, O.directByte(a[0], ctx)]);
      bad();
    }

    case 'XCH': {
      if (n !== 2 || !O.isA(a[0])) bad();
      const s = a[1];
      if (O.isRn(s)) return fixed(1, () => [0xC8 + s.n]);
      if (O.isDirOrBit(s)) return fixed(2, (ctx) => [0xC5, O.directByte(s, ctx)]);
      if (O.isRi(s)) return fixed(1, () => [0xC6 + s.n]);
      bad();
    }
    case 'XCHD': {
      if (n !== 2 || !O.isA(a[0]) || !O.isRi(a[1])) bad();
      return fixed(1, () => [0xD6 + a[1].n]);
    }

    case 'JZ': if (n !== 1) bad(); return fixed(2, (ctx) => [0x60, O.rel8(a[0].expr, ctx, 2)]);
    case 'JNZ': if (n !== 1) bad(); return fixed(2, (ctx) => [0x70, O.rel8(a[0].expr, ctx, 2)]);
    case 'JC': if (n !== 1) bad(); return fixed(2, (ctx) => [0x40, O.rel8(a[0].expr, ctx, 2)]);
    case 'JNC': if (n !== 1) bad(); return fixed(2, (ctx) => [0x50, O.rel8(a[0].expr, ctx, 2)]);
    case 'JB': if (n !== 2) bad(); return fixed(3, (ctx) => [0x20, O.bitByte(a[0], ctx), O.rel8(a[1].expr, ctx, 3)]);
    case 'JNB': if (n !== 2) bad(); return fixed(3, (ctx) => [0x30, O.bitByte(a[0], ctx), O.rel8(a[1].expr, ctx, 3)]);
    case 'JBC': if (n !== 2) bad(); return fixed(3, (ctx) => [0x10, O.bitByte(a[0], ctx), O.rel8(a[1].expr, ctx, 3)]);

    case 'CJNE': {
      if (n !== 3) bad();
      const [d, s, r] = a;
      if (O.isA(d) && O.isImm(s)) return fixed(3, (ctx) => [0xB4, O.immByte(s, ctx), O.rel8(r.expr, ctx, 3)]);
      if (O.isA(d) && O.isDirOrBit(s)) return fixed(3, (ctx) => [0xB5, O.directByte(s, ctx), O.rel8(r.expr, ctx, 3)]);
      if (O.isRi(d) && O.isImm(s)) return fixed(3, (ctx) => [0xB6 + d.n, O.immByte(s, ctx), O.rel8(r.expr, ctx, 3)]);
      if (O.isRn(d) && O.isImm(s)) return fixed(3, (ctx) => [0xB8 + d.n, O.immByte(s, ctx), O.rel8(r.expr, ctx, 3)]);
      bad();
    }
    case 'DJNZ': {
      if (n !== 2) bad();
      const [d, r] = a;
      if (O.isDirOrBit(d)) return fixed(3, (ctx) => [0xD5, O.directByte(d, ctx), O.rel8(r.expr, ctx, 3)]);
      if (O.isRn(d)) return fixed(2, (ctx) => [0xD8 + d.n, O.rel8(r.expr, ctx, 2)]);
      bad();
    }

    case 'SJMP': if (n !== 1) bad(); return fixed(2, (ctx) => [0x80, O.rel8(a[0].expr, ctx, 2)]);
    case 'AJMP': if (n !== 1) bad(); return fixed(2, (ctx) => O.ajmpAcallBytes(a[0].expr, ctx, false));
    case 'LJMP': if (n !== 1) bad(); return fixed(3, (ctx) => O.ljmpLcallBytes(a[0].expr, ctx, false));
    case 'ACALL': if (n !== 1) bad(); return fixed(2, (ctx) => O.ajmpAcallBytes(a[0].expr, ctx, true));
    case 'LCALL': if (n !== 1) bad(); return fixed(3, (ctx) => O.ljmpLcallBytes(a[0].expr, ctx, true));

    case 'JMP': // JMP @A+DPTR (den generiska "JMP label" hanteras separat i assemble.js)
      if (n === 1 && a[0].type === '@A+DPTR') return fixed(1, () => [0x73]);
      bad();

    default:
      err(`okänd instruktion "${op}"`);
  }
}

  //================================================================

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
    if (op === 'ORG_END') continue; // ingen storlek, kollas i sista passet
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
  let orgEndLimit = null; // satt av ORG_END, gäller tills nästa ORG
  const checkOrgEnd = (lc, size, rec) => {
    if (orgEndLimit !== null && size > 0 && lc + size - 1 > orgEndLimit) {
      throw new AsmError(
        `koden här (0x${lc.toString(16)}-0x${(lc + size - 1).toString(16)}) går förbi ORG_END-gränsen 0x${orgEndLimit.toString(16)}`,
        rec.lineNo, rec.raw);
    }
  };
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const lc = addresses[i];
    symbols.set('$', lc);
    if (!rec.op) { listing.push({ addr: lc, outBytes: [], rec }); continue; }
    const op = rec.op.toUpperCase();

    if (op === 'ORG') { orgEndLimit = null; listing.push({ addr: lc, outBytes: [], rec }); continue; }
    if (op === 'ORG_END') { orgEndLimit = evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw); listing.push({ addr: lc, outBytes: [], rec }); continue; }
    if (op === 'EQU') { listing.push({ addr: lc, outBytes: [], rec }); continue; }
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
      checkOrgEnd(lc, bs.length, rec);
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
      checkOrgEnd(lc, bs.length, rec);
      continue;
    }
    if (op === 'DS') { checkOrgEnd(lc, evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw), rec); listing.push({ addr: lc, outBytes: [], rec }); continue; }

    let concreteOp = op;
    if (isGenericJmpCall(rec)) {
      const isCall = op === 'CALL';
      const targetAddr = evalExpr(rec.args[0], symbols, rec.lineNo, rec.raw);
      concreteOp = O.chooseJumpForm(targetAddr, lc, isCall).form;
    }

    const desc = build(concreteOp, rec.args, rec.lineNo, rec.raw);
    checkOrgEnd(lc, desc.size, rec);
    const ctx = { addr: lc, symbols, lineNo: rec.lineNo, lineText: rec.raw };
    const outBytes = desc.emit(ctx).map(b => b & 0xFF);
    outBytes.forEach((b, k) => bytes.set(lc + k, b));
    listing.push({ addr: lc, outBytes, rec, concreteOp: concreteOp !== op ? concreteOp : null });
  }

  return { bytes, symbols, listing };
}

  global.ASM51 = { assemble: assemble, AsmError: AsmError, SFR: SFR, BIT_NAMES: BIT_NAMES };
})(typeof window !== 'undefined' ? window : this);
