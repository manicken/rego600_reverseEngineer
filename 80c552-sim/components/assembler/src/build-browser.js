#!/usr/bin/env node
'use strict';
// Bygger asm51-browser.js genom att slå ihop Node-källfilerna till en enda
// fil utan require/module.exports, redo för <script>-taggar i en webbsida.
// Kör: node build-browser.js
const fs = require('fs');

function stripCommon(file) {
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/^#!.*\n/, '');
  src = src.split('\n').filter(l => !/^\s*const .* = require\(/.test(l)).join('\n');
  src = src.replace(/^'use strict';\s*\n/, '');
  return src;
}
function stripExportsBlock(src) {
  return src.replace(/module\.exports\s*=\s*\{[\s\S]*?\};\s*$/m, '').trim();
}

const asm51 = stripExportsBlock(stripCommon('asm51.js'));
const operand = stripExportsBlock(stripCommon('operand.js'));
// opcodes.js exporteras och används som "O.xxx" på andra ställen, så dess
// module.exports blir "const O = {...}" istället för att strykas helt.
let opcodes = stripCommon('opcodes.js');
opcodes = opcodes.replace(/module\.exports\s*=\s*\{/, 'const O = {').trim();
const instructions = stripExportsBlock(stripCommon('instructions.js'));
const assembleSrc = stripExportsBlock(stripCommon('assemble.js'));

const parts = [asm51, operand, opcodes, instructions, assembleSrc];

const bundle = `/*!
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

${parts.join('\n\n  //================================================================\n\n')}

  global.ASM51 = { assemble: assemble, AsmError: AsmError, SFR: SFR, BIT_NAMES: BIT_NAMES };
})(typeof window !== 'undefined' ? window : this);
`;

fs.writeFileSync('asm51-browser.js', bundle);
console.log('Skrev asm51-browser.js (' + bundle.length + ' tecken)');
