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
  i2c_bus.js             on-chip I2C master + virtual slave device registry
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
  '80c552/membus.js', '80c552/i2c_bus.js', '80c552/gpio_bitbang.js',
  '80c552/logging.js', '80c552/80c552.js',
];
// concatenate + eval in order, or drop <script> tags for these files into
// an HTML page in the order above (do NOT load vendor/51vm_peripheral.js —
// 80c552_sfr.js replaces it)

const bus = new I2CBus();
bus.attach(0x50, new RegisterAddressedDevice(256)); // e.g. a 256-byte EEPROM

const cpu = create_80c552({
  flashImage: myFirmwareBytes,     // optional initial AM29F040 contents
  adcChannels: [1.2, 0,0,0,0,0,0,0], // optional initial analog inputs
  i2cBus: bus,                       // omit to leave I2C SFRs inert
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

## Hooking up a virtual I2C device

`i2c_bus.js` drives S1CON/S1STA/S1DAT as an I2C **master** (the 80C552
talking to sensors/EEPROMs/RTCs on the bus) and reproduces the real
hardware's handshake — firmware sets STA/STO/AA and writes S1DAT, clears
SI to say "go", hardware replies with a status code in S1STA and pulses
SI again — synchronously, with no real bus timing, the same instant-
completion approach used for the ADC and flash above.

A virtual device is any object with `start(isRead)`, `write(byte)`,
`read()`, and optionally `stop()`:

```js
const bus = new I2CBus();
bus.attach(0x50, {
  start(isRead) { /* return true to ACK, false to NACK */ return true; },
  write(byte)   { /* master is sending a byte; return true to ACK */ ... },
  read()        { /* master is clocking a byte out; return 0-255 */ ... },
  stop()        { /* optional: STOP condition seen */ },
});

const cpu = create_80c552({ i2cBus: bus });
```

For the common case (register-pointer devices — EEPROMs, RTCs, most
sensors: first write byte after START sets a register pointer,
subsequent bytes read/write `registers[pointer++]`), use the built-in
`RegisterAddressedDevice`:

```js
const eeprom = bus.attach(0x50, new RegisterAddressedDevice(256));
eeprom.registers[0x00] = 0x42; // pre-seed contents if useful
```

Both the write path and the read path (including repeated START) are
verified against real assembled 8051 `MOV S1CON,#…` / `MOV S1DAT,#…`
sequences, not just direct JS calls — see the state codes table at the
top of `i2c_bus.js` if you're writing your own device and need to know
exactly what status byte to expect at each step.

**Not implemented:** slave mode (the 80C552 responding to another
master's START), arbitration-lost / bus-error states (there's only ever
one master in this simulator), and clock-rate (CR0-CR2) timing. Say the
word if the REGO600 work turns out to need the 80C552 acting as an I2C
slave and I'll add that state machine too.

## Bitbanged GPIO: DS1302, 74HC4094, CD4021

`gpio_bitbang.js` covers protocols firmware drives by hand on plain port
pins (no dedicated SFR to hook, unlike ADC/I2C above). The mechanism:
`watchPin(port, bit, {onRise, onFall})` fires on every edge of a pin the
firmware toggles; `drivePinInput(port, bit, supplier)` makes a pin read
back whatever a virtual device is driving.

```js
const ds = new DS1302();
install_ds1302(cpu, ds, {
  ce:   { port: cpu.P1, bit: 0 },
  sclk: { port: cpu.P1, bit: 1 },
  io:   { port: cpu.P0, bit: 6 }, // each pin is independent - any port, any bit
});
// ds.clock[0..7] = sec,min,hour,date,month,day,year,wp (raw BCD bytes)
// ds.ram[0..30]  = 31-byte battery-backed RAM
ds.setDateTime(new Date(2026, 6, 31, 23, 59, 58)); // set to a specific moment
ds.startClock();  // self-running: ticks once a second on the wall clock,
                   // independent of the CPU's execute loop - like the real
                   // chip's own crystal. stopClock() to stop it.
// ds.tick() to advance by hand instead; honours the CH (clock-halt) bit
// at clock[0] bit7, same as real hardware
// ds.getDateTime() -> JS Date, for reading it back out for debugging

const shOut = new ShiftOut4094();
install_4094(cpu, shOut, {
  data: { port: cpu.P3, bit: 0 },
  clk:  { port: cpu.P3, bit: 1 },
  str:  { port: cpu.P1, bit: 4 },
});
// shOut.outputs = latched 8-bit output byte, MSB-first shift-in

const shIn = new ShiftIn4021();
install_4021(cpu, shIn, {
  pl:  { port: cpu.P3, bit: 3 },
  clk: { port: cpu.P3, bit: 4 },
  q:   { port: cpu.P2, bit: 7 },
});
shIn.inputs = 0x5A; // drive your simulated switches/sensors here
// firmware reads them out serially via q, MSB-first
```

Every pin takes its own `{port, bit}` - CE and SCLK don't have to share a
port, DATA/CLK/STROBE don't either. Nothing here assumes one connector
maps to one port.
follows each chip's real shift direction; verified end-to-end with plain
port-bit toggling standing in for `SETB`/`CLR`, including a DS1302
burst-mode read/write.

## Logging everything sent to a device

`logging.js` wraps any device object in a Proxy that logs every method
call and its result — no bespoke logging code needed per peripheral.
Wrap it before attaching/installing:

```js
const eeprom = traceDevice(new RegisterAddressedDevice(256), "EEPROM@0x50");
bus.attach(0x50, eeprom);

const ds = traceDevice(new DS1302(), "DS1302");
install_ds1302(cpu, ds, { ce: {...}, sclk: {...}, io: {...} });
```

Every underlying call is logged, including the low-level per-bit ones
(`sclkRise` on the DS1302, for example) — a full transaction can get
noisy. Filter to just the calls you care about with `only`:

```js
traceDevice(dev, "EEPROM@0x50", { only: ["start", "write", "read"] })
```

`makeLogBuffer()` gives you `{ lines, logger }` to collect log lines into
an array instead of printing to the console — pass `logger` as `opts.logger`.

## Sharing a pin between two devices

Shared pins just work: `watchPin()` pushes a closure onto the port's
`setlistener` array, so two devices watching the same `{port, bit}` —
say a DS1302's CE line doubling as a watchdog's strobe input — both get
called on every edge of that pin, independently:

```js
const ds = new DS1302();
const wd = new TC1232({ timeoutMs: 200 }); // e.g. a TC1232 watchdog

const sharedCE = { port: cpu.P4, bit: 1 }; // one pin object, passed to both
install_ds1302(cpu, ds, { ce: sharedCE, sclk: {...}, io: {...} });
install_tc1232(cpu, wd, { st: sharedCE });
```

`TC1232` (also in `gpio_bitbang.js`) models a strobe-input watchdog:
`strobe()` resets its internal timer, `startMonitoring()` polls on the
wall clock (same real-time approach as `DS1302.startClock()`) and fires
`onReset(count)` if `timeoutMs` elapses without a strobe.

**One thing worth knowing about this specific pairing:** DS1302 CE stays
held high for an *entire* transaction (command + data bits) and only
edges twice - once at transaction start, once at the end. If it's
doing double duty as a watchdog strobe, the watchdog only gets serviced
at those two points, not once per bit/byte - worth checking that matches
how often your firmware actually talks to the RTC versus the watchdog's
configured timeout.

**Gotcha specific to P4:** P4 (and P5) reset to `0xFF` in this package,
matching real quasi-bidirectional ports floating high with no external
pull-down - so a CE pin on P4 starts out *already high* after reset.
If your firmware doesn't explicitly drive it low during init, the first
`SETB` won't produce a rising edge (it's already 1), and the DS1302
model won't see a transaction start. Ports P0-P3 default to `0` instead
(js51 core's own default), so this only bites on P4/P5.

## Not implemented

Timer2/capture-compare, serial, PWM, and watchdog/T3 all have their SFRs
installed and participate in the extended interrupt controller's flag
checks, but none of them run any actual timing/protocol logic yet —
reads/writes just hit the raw register with no side effects beyond
what's wired above. UART-over-Web-Serial is a separately-planned piece
of the broader REGO600 simulator effort, not part of this delivery.

## Interrupt vector ordering caveat

The extended interrupt vectors (Timer2 → ADC → I2C on IEN1) are wired in
the commonly documented order, but Philips revised bit assignments
between the 80C552/83C552/8xC562 derivatives more than once — double
check `80c552_sfr.js`'s `default_irq()` against your own datasheet copy
before relying on exact interrupt behavior for firmware reverse
engineering.
