# asm51 — enkel 8051-assembler

Löser hela poängen med problemet: du skriver `JMP label` / `CALL label`
och sen räknar assemblern själv ut om det ska bli `SJMP`, `AJMP`/`ACALL`
eller `LJMP`/`LCALL` beroende på hur långt bort målet hamnar. Ändra kod
mitt i filen och kör om — inga offsets att räkna om för hand.

## Två sätt att köra

**I webbläsaren / din simulator (`asm51-browser.js`)** — en enda fil,
inga moduler eller byggverktyg behövs i sidan:

```html
<script src="assembler/asm51-browser.js"></script>
<script>
  try {
    const result = ASM51.assemble(sourceText);
    // result.bytes   -> Map<adress, byte>   (klistra in i din minnesmodell)
    // result.symbols -> Map<NAMN, värde>
    // result.listing -> [{addr, outBytes, rec, concreteOp}, ...] för debug-vy
  } catch (e) {
    if (e instanceof ASM51.AsmError) {
      console.error(`Rad ${e.lineNo}: ${e.message}`);
    }
  }
</script>
```

Detta var felet du fick: `asm51.js`/`operand.js`/`opcodes.js`/
`instructions.js`/`assemble.js` är skrivna som Node.js-moduler
(`require`/`module.exports`), vilket bara fungerar i Node — en vanlig
`<script>`-tagg i webbläsaren känner inte till `require`. **Ladda bara
`asm51-browser.js`** i din sida, inte de fem separata filerna. Om du
ändrar något i källfilerna, kör `node build-browser.js` (kräver Node.js
lokalt) för att bygga om `asm51-browser.js` igen.

**Kommandoraden (`cli.js`, kräver Node.js)** — för att bygga `.hex`-filer
från terminalen, t.ex. i ett byggskript:

```
node cli.js program.asm                  # skriver Intel HEX på stdout
node cli.js program.asm -o program        # skriver program.hex
node cli.js program.asm --bin -o program  # skriver program.bin (rå binärfil)
node cli.js program.asm --js  -o program  # skriver program.js (byte-array)
node cli.js program.asm --list -o program # skriver program.lst (listing)
node cli.js program.asm --sym  -o program # skriver program.sym (symboltabell)
```

Flera flaggor kan kombineras i samma anrop.

## Syntax

```asm
        ORG 0000h
START:  MOV  SP, #60h
        CLR  A
        MOV  P1, A
LOOP:   SETB P1_0
        LCALL DELAY
        CLR   P1_0
        JMP   LOOP        ; generiskt hopp — blir SJMP/AJMP/LJMP automatiskt

DELAY:  MOV  R7, #0FFh
D1:     DJNZ R7, D1
        RET

MYCONST EQU 42            ; namn utan kolon funkar bara för EQU
        DB 1, 2, "hej", 0
        DW LOOP, DELAY     ; framåtreferenser funkar (t.ex. hopptabeller)
        END
```

- Tal: `123`, `0x7B`, `7Bh`, `0b01111011`, `1111011b`, `'A'` (teckenlitteral)
- Uttryck: `+ - * /`, parenteser, `HIGH(x)` / `LOW(x)`, `$` = nuvarande adress
- Kommentar: `;` till radslut
- Direktiv: `ORG`, `EQU`, `DB`, `DW`, `DS` (reservera n byte), `END`

`JMP`/`CALL` med en etikett är alltid det generiska, auto-väljande
pseudo-mnemonicet. Vill du styra formen själv (t.ex. för att garantera en
viss cykeltid) skriver du `SJMP`/`AJMP`/`LJMP`/`ACALL`/`LCALL` explicit —
då får du ett tydligt felmeddelande om målet inte går att nå med den
formen, istället för att den tyst väljer en annan.

## Filstruktur (var du lägger till saker)

- **`asm51.js`** — `SFR`- och `BIT_NAMES`-listorna (bara enkla
  `NAMN: adress`-par), uttrycksutvärderare, radtokenizer. **Lägg till egna
  SFR:er/bitnamn här** om din chip-variant skiljer sig, eller använd `EQU`
  direkt i din .asm-fil.
- **`operand.js`** — klassificerar en operand-sträng till en typ (`A`,
  `Rn`, `@Ri`, `imm`, `direct_or_bit`, osv). Om du vill stödja en ny
  adresseringsform lägger du till en gren här.
- **`opcodes.js`** — små hjälpfunktioner som kodar direct/bit/immediate/
  relativa hopp/`AJMP`/`LJMP`-adresser till bytes, plus
  `chooseJumpForm()` som är hela auto-relaxeringslogiken.
- **`instructions.js`** — en `switch` per mnemonic som matchar
  operandtyper mot rätt opkod. **Lägg till/ändra en instruktion här** —
  varje `case` är fristående och lätt att kopiera som mall för en ny.
- **`assemble.js`** — själva tvåpass-motorn: bygger adresstabell,
  itererar tills hopp-storlekarna är stabila, skriver sedan ut bytes.
- **`cli.js`** — kommandoradsgränssnitt (Node.js) + utdataformat (HEX/bin/JS/listing).
- **`build-browser.js`** — slår ihop de fem källfilerna ovan (utan
  `cli.js`) till `asm51-browser.js`. Kör `node build-browser.js` efter
  att du ändrat någon källfil.
- **`asm51-browser.js`** — den hopslagna, `<script>`-taggbara filen —
  detta är filen din webbsida/simulator ska ladda.

## Kända begränsningar

Ingen full "riktig" assembler: inga makron, inga villkorliga
direktiv (`IF`/`ENDIF`), och `EQU` måste stå före sin första
användning (labels och `DB`/`DW`-tabeller får däremot gärna
framåtreferera fritt). Det täcker hela 8051-instruktionsuppsättningen
(alla ~111 mnemonics/adresseringsformer), så det som fattas är bekvämlighet,
inte täckning.
