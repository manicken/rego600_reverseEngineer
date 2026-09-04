#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { assemble } = require('./assemble.js');
const { AsmError } = require('./asm51.js');

function intelHex(bytes) {
  const addrs = [...bytes.keys()].sort((a, b) => a - b);
  const lines = [];
  let i = 0;
  while (i < addrs.length) {
    const start = addrs[i];
    const rowBytes = [];
    let addr = start;
    while (i < addrs.length && addrs[i] === addr && rowBytes.length < 16) {
      rowBytes.push(bytes.get(addrs[i]));
      addr++; i++;
    }
    const len = rowBytes.length;
    const rec = [len, (start >> 8) & 0xFF, start & 0xFF, 0x00, ...rowBytes];
    let sum = rec.reduce((a, b) => a + b, 0);
    const chk = (0x100 - (sum & 0xFF)) & 0xFF;
    lines.push(':' + rec.concat(chk).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(''));
  }
  lines.push(':00000001FF'); // EOF-record
  return lines.join('\n') + '\n';
}

function rawBinary(bytes) {
  if (bytes.size === 0) return Buffer.alloc(0);
  const max = Math.max(...bytes.keys());
  const buf = Buffer.alloc(max + 1, 0x00);
  for (const [addr, b] of bytes) buf[addr] = b;
  return buf;
}

function jsArray(bytes, varName) {
  if (bytes.size === 0) return `const ${varName} = [];\nmodule.exports = ${varName};\n`;
  const max = Math.max(...bytes.keys());
  const arr = new Array(max + 1).fill(0);
  for (const [addr, b] of bytes) arr[addr] = b;
  const rows = [];
  for (let i = 0; i < arr.length; i += 16) rows.push('  ' + arr.slice(i, i + 16).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ') + ',');
  return `// Genererad av asm51.js\nconst ${varName} = [\n${rows.join('\n')}\n];\nmodule.exports = ${varName};\n`;
}

function listingText(listing) {
  const out = [];
  for (const entry of listing) {
    const addrStr = entry.addr.toString(16).toUpperCase().padStart(4, '0');
    const byteStr = entry.outBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    const labelStr = entry.rec.label ? entry.rec.label + ':' : '';
    const opStr = entry.rec.op ? entry.rec.op + ' ' + entry.rec.args.join(', ') : '';
    const note = entry.concreteOp ? `  ; -> ${entry.concreteOp}` : '';
    out.push(
      `${addrStr}  ${byteStr.padEnd(11)} ${String(entry.rec.lineNo).padStart(4)}: ${labelStr}${labelStr ? ' ' : ''}${opStr}${note}`
    );
  }
  return out.join('\n') + '\n';
}

function symbolTableText(symbols) {
  const rows = [...symbols.entries()]
    .filter(([k]) => k !== '$')
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k.padEnd(16)} 0x${(v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`);
  return rows.join('\n') + '\n';
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    console.log(
      'Användning: node asm51.js <fil.asm> [-o <utfil>] [--hex] [--bin] [--js] [--list] [--sym]\n' +
      '  Standard: skriver Intel HEX till stdout (eller -o om angiven).\n' +
      '  Flera format kan anges samtidigt; -o används då som bas-filnamn.'
    );
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const input = argv.find(a => !a.startsWith('-') && argv[argv.indexOf(a) - 1] !== '-o');
  const outIdx = argv.indexOf('-o');
  const outBase = outIdx >= 0 ? argv[outIdx + 1] : null;
  const wantHex = argv.includes('--hex') || (!argv.includes('--bin') && !argv.includes('--js') && !argv.includes('--list'));
  const wantBin = argv.includes('--bin');
  const wantJs = argv.includes('--js');
  const wantList = argv.includes('--list');
  const wantSym = argv.includes('--sym');

  if (!input) { console.error('Ingen indatafil angiven.'); process.exit(1); }

  const text = fs.readFileSync(input, 'utf8');
  let result;
  try {
    result = assemble(text);
  } catch (e) {
    if (e instanceof AsmError) {
      console.error(`Fel på rad ${e.lineNo}: ${e.message}`);
      if (e.lineText) console.error('  ' + e.lineText.trim());
    } else {
      console.error('Fel: ' + e.message);
    }
    process.exit(1);
  }

  const base = outBase || path.basename(input).replace(/\.[^.]+$/, '');

  if (wantHex) {
    const hex = intelHex(result.bytes);
    if (outBase || wantBin || wantJs || wantList) fs.writeFileSync(base + '.hex', hex);
    else process.stdout.write(hex);
  }
  if (wantBin) fs.writeFileSync(base + '.bin', rawBinary(result.bytes));
  if (wantJs) fs.writeFileSync(base + '.js', jsArray(result.bytes, 'ROM'));
  if (wantList) fs.writeFileSync(base + '.lst', listingText(result.listing));
  if (wantSym) fs.writeFileSync(base + '.sym', symbolTableText(result.symbols));

  const totalBytes = result.bytes.size;
  const maxAddr = totalBytes ? Math.max(...result.bytes.keys()) : 0;
  console.error(`OK: ${totalBytes} byte assemblerade, högsta adress 0x${maxAddr.toString(16).toUpperCase()}.`);
}

main();
