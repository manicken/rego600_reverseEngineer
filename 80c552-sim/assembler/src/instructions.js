'use strict';
const O = require('./opcodes.js');
const { classify } = require('./operand.js');

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

    case 'PUSH': if (n !== 1 || !O.isDirOrBit(a[0])) bad(); return fixed(2, (ctx) => [0xC0, O.directByte(a[0], ctx)]);
    case 'POP': if (n !== 1 || !O.isDirOrBit(a[0])) bad(); return fixed(2, (ctx) => [0xD0, O.directByte(a[0], ctx)]);

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

module.exports = { build };
