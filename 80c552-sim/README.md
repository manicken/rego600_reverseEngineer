# 80C552 simulator (js51-based)

Extends [Aimini/js51](https://github.com/Aimini/js51) (a plain 8051 core
simulator in JS) into a Philips/NXP 80C552 simulator with:

- the real 80C552 SFR map (ports P0-P5, Timer0/1, Timer2 + capture/compare,
  serial, I2C, ADC, PWM, watchdog/T3) and its extended two-level interrupt
  controller (IEN0/IP0 + IEN1/IP1)
- an 8-channel, 10-bit ADC (ADCON/ADCH, P5.0-P5.7) with settable per-channel
  input voltages
- a GPIO-driven external memory bus: a 62256 SRAM and an AM29F040 flash
  share the bus and are switched by a bank-select GPIO bit, with the
  flash's 3 extra address lines also GPIO-driven — matching the manual
  bank-swap hardware design this was built for
- a browser demo (`demo/index.html`) to load firmware, step/run, flip the
  GPIO bank-select bits, and drive ADC channel voltages by hand

## Layout

```
vendor/       unmodified js51 core (cloned from Aimini/js51)
80c552/       the 80C552 extension
  80c552_sfr.js        SFR map + extended interrupt controller
  80c552_adc.js        ADC peripheral (ADCON/ADCH)
  device_62256.js       32K SRAM model
  device_am29f040.js    512K flash model (JEDEC command set)
  membus.js             GPIO-driven bank-swap bus controller
  80c552.js             create_80c552(opts) - one-call factory
demo/
  index.html            browser UI, no build step
```

## Quick start (Node)

```js
const files = [
  'vendor/51vm_core.js', 'vendor/51vm_operand.js', 'vendor/51vm_operation.js',
  'vendor/51vm_opcode_decoder.js', 'vendor/51vm_ctl.js', 'vendor/hex_decoder.js',
  '80c552/80c552_sfr.js', '80c552/80c552_adc.js',
  '80c552/device_62256.js', '80c552/device_am29f040.js',
  '80c552/membus.js', '80c552/80c552.js',
];
// concatenate + eval in order, or drop <script> tags for these files into
// an HTML page in the order above (do NOT load vendor/51vm_peripheral.js —
// 80c552_sfr.js replaces it)

const cpu = create_80c552({
  flashImage: myFirmwareBytes,     // optional initial AM29F040 contents
  adcChannels: [1.2, 0,0,0,0,0,0,0], // optional initial analog inputs
});
cpu.IDATA = decode_ihex(hexText);   // load code into on-chip ROM
cpu.reset();
cpu.next(1000);                     // step 1000 instructions
```

## Browser

Open `demo/index.html` directly (or via a local static server if your
browser blocks `file://` fetches). Load a `.hex` or `.bin`, step/run, and
use the P4 bit buttons to flip the bank-select / extended-address GPIO
lines live.

## External memory bank swap

`membus.js` overrides `cpu.get_XRAM_cell` (js51's single hook point for
every `MOVX` access) to read the current **P4 output-latch** value on each
access and route the access accordingly:

| P4 bit | Default meaning |
|---|---|
| P4.0 | bank select: 0 = 62256 SRAM enabled, 1 = AM29F040 flash enabled |
| P4.1-P4.3 | flash's extra address lines A16, A17, A18 |

This is a **documented assumption about your board**, not a datasheet
fact — the real 80C552 datasheet lists P4 alternate functions as Timer T2
compare/set/reset/toggle outputs (CMSR0-5, CMT0-1), which this design is
evidently not using on those bits. Pass different bits via
`create_80c552({ bankSelectBit, addrExtBits })` if your schematic differs.

The 62256 ignores the extended address bits (it only has 15 address
lines / 32KB); the AM29F040 combines them with the 16-bit `MOVX` address
to form a full 19-bit (512KB) address.

## AM29F040 flash model

Implements the standard AMD/Fujitsu JEDEC command set: byte program,
chip erase, sector erase (8×64KB sectors), autoselect/ID read
(manufacturer `0x01`, device `0xA4`), and the `0xF0` software reset.

Simplifications, listed in the file header of `device_am29f040.js`:
- program/erase complete **instantly** — no `tWC`/`tBP`/`tSCE` timing is
  modeled. A firmware DQ7/DQ6 data-polling loop will see "done" on its
  first read, which is a correct end state even without the real latency.
- unlock-cycle addresses are matched on the low 11 bits (`addr & 0x7FF`
  against `0x555`/`0x2AA`), the common simplification most 29F0x0-family
  parts use regardless of total capacity.
- no erase-suspend/resume, no sector protection, no write-protect pin.

## ADC

`ADCON`/`ADCH` behave per the datasheet (10-bit result, upper 8 bits in
`ADCH`, low 2 bits in `ADCON.7:6`, channel select in `ADCON.2:0`, `ADCI`
completion flag in `ADCON.4`). Conversions complete synchronously the
instant `ADCS` is set — again, no 50-machine-cycle timing, just the
correct end state. Set analog inputs with:

```js
cpu.adc.setChannelVoltage(channelIndex /* 0-7 */, volts);
```

`vref` defaults to 5.12V (the datasheet's own test-condition reference);
override with `create_80c552({ adcVref: ... })`.

## What's still a stub

Timer2/capture-compare, I2C (S1CON/S1STA/S1DAT/S1ADR), serial, PWM, and
watchdog/T3 all have their SFRs installed and participate in the extended
interrupt controller's flag checks, but none of them run any actual
timing/protocol logic yet — reads/writes just hit the raw register with
no side effects beyond what's wired above. That matches where the
broader REGO600 simulator effort currently stands: UART-over-Web-Serial
and I2C are separately-planned pieces of that work, not part of this
external-memory/ADC delivery.

## Interrupt vector ordering caveat

The extended interrupt vectors (Timer2 → ADC → I2C on IEN1) are wired in
the commonly documented order, but Philips revised bit assignments
between the 80C552/83C552/8xC562 derivatives more than once — double
check `80c552_sfr.js`'s `default_irq()` against your own datasheet copy
before relying on exact interrupt behavior for firmware reverse
engineering.
