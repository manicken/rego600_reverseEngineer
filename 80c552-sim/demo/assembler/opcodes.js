'use strict';
const { AsmError } = require('./asm51.js');
const { resolveValue } = require('./operand.js');

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

module.exports = {
  err, checkByte, checkWord,
  isA, isC, isAB, isDPTR, isAtDPTR, isAtADPTR, isAtAPC, isRn, isRi, isImm, isBitN, isDirOrBit,
  immByte, immWord, directByte, bitByte, rel8, ajmpAcallBytes, ljmpLcallBytes, chooseJumpForm,
};
