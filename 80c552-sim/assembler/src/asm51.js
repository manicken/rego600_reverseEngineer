#!/usr/bin/env node
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
  P1: 0x90, SCON: 0x98, SBUF: 0x99,
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
  SM0: 0x9F, SM1: 0x9E, SM2: 0x9D, REN: 0x9C, TB8: 0x9B, RB8: 0x9A, TI: 0x99, RI: 0x98,
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
      const pb = portBitName(up);
      if (pb !== null) return pb;
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

module.exports = {
  AsmError, SFR, BIT_NAMES,
  tokenizeLines, evalExpr, splitArgs,
};
