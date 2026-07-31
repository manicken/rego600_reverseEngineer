/**
 * gpio_bitbang.js
 *
 * Firmware that bitbangs a protocol just does SETB/CLR/MOV on ordinary
 * port pins - there's no dedicated SFR to hook like ADCON or S1CON. The
 * trick is the same one used everywhere else in this package: attach to
 * setlistener (fires on every write to the port, i.e. every pin change)
 * to see output pins toggle, and to getlistener (fires on every read) to
 * inject a device's driven value into an input pin just before the CPU
 * samples it.
 *
 * IMPORTANT about getlistener: js51's reg.get() always returns `_value`
 * - a getlistener can't "return" an override, it has to mutate `_value`
 * in place before get() reads it back. drivePinInput() below does that.
 */

function watchPin(port, bit, { onRise, onFall } = {}) {
    port.setlistener.push((oldv, newv) => {
        const o = (oldv >> bit) & 1, n = (newv >> bit) & 1
        if (o === n) return
        if (n === 1 && onRise) onRise()
        if (n === 0 && onFall) onFall()
    })
}

function readPinLatch(port, bit) {
    return (port._value >> bit) & 1 // the pin's current output-latch bit, no listener side effects
}

/** Make `port` bit `bit` return whatever supplier() says on every read. */
function drivePinInput(port, bit, supplier) {
    port.getlistener.push(() => {
        const b = supplier() ? 1 : 0
        port._value = (port._value & ~(1 << bit)) | (b << bit)
    })
}

// ============================================================
// DS1302 - 3-wire (RST/CE, SCLK, I/O) RTC + 31-byte RAM
// ============================================================
//
// Protocol (per Dallas/Maxim DS1302 datasheet): CE high starts a
// transaction. Each SCLK rising edge while CE is high shifts one bit,
// LSB first. The first 8 bits are the command byte:
//   bit7=1 (always) | bit6: 0=clock/calendar 1=RAM | bits5-1: address
//   (0x1F = burst mode) | bit0: 0=write 1=read
// For writes, the next 8 bits (sampled on SCLK rising edges) are the
// data byte. For reads, the DS1302 drives the data byte onto I/O one
// bit per SCLK *falling* edge, LSB first, for the CPU to sample.
//
// Clock/calendar registers are stored as raw BCD bytes exactly as a
// firmware driver would read/write them (index: 0 sec,1 min,2 hour,
// 3 date,4 month,5 day,6 year,7 write-protect) - this model does NOT
// run a real ticking clock; it just holds whatever was last written
// (or whatever you preset via `ds1302.clock[...]`). Add a setInterval-
// driven tick yourself if you need wall-clock behaviour.
function ds1302_toBCD(n) { return ((Math.floor(n / 10) % 10) << 4) | (n % 10) }
function ds1302_fromBCD(b) { return ((b >> 4) & 0x0F) * 10 + (b & 0x0F) }

function DS1302() {
    this.clock = new Uint8Array(8) // sec,min,hour,date,month,day,year,wp
    this.ram = new Uint8Array(31)
    this._phase = "idle"   // idle | cmd | write | read
    this._bitPos = 0
    this._cmdByte = 0
    this._dataByte = 0
    this._target = null    // {isRam, addr, burst}
    this._outBit = 0
    this._suppressNextFall = false
}

DS1302.prototype._regArray = function () {
    return this._target.isRam ? this.ram : this.clock
}

/** Set the clock/calendar registers from a JS Date (or now, by default). */
DS1302.prototype.setDateTime = function (date = new Date()) {
    const ch = this.clock[0] & 0x80 // preserve clock-halt bit
    this.clock[0] = ch | ds1302_toBCD(date.getSeconds())
    this.clock[1] = ds1302_toBCD(date.getMinutes())
    this.clock[2] = ds1302_toBCD(date.getHours()) // 24-hour mode, bit7=0
    this.clock[3] = ds1302_toBCD(date.getDate())
    this.clock[4] = ds1302_toBCD(date.getMonth() + 1)
    this.clock[5] = ds1302_toBCD(date.getDay() === 0 ? 7 : date.getDay()) // 1=Mon..7=Sun
    this.clock[6] = ds1302_toBCD(date.getFullYear() % 100)
}

/** Read the clock/calendar registers back out as a JS Date (year assumed 2000-2099). */
DS1302.prototype.getDateTime = function () {
    const sec = ds1302_fromBCD(this.clock[0] & 0x7F)
    const min = ds1302_fromBCD(this.clock[1] & 0x7F)
    const hr = ds1302_fromBCD(this.clock[2] & 0x3F)
    const date = ds1302_fromBCD(this.clock[3])
    const month = ds1302_fromBCD(this.clock[4])
    const year = 2000 + ds1302_fromBCD(this.clock[6])
    return new Date(year, month - 1, date, hr, min, sec)
}

DS1302.prototype._daysInMonth = function (month, year2digit) {
    const full = 2000 + year2digit
    const isLeap = (full % 4 === 0 && (full % 100 !== 0 || full % 400 === 0))
    const days = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return days[(month - 1 + 12) % 12] || 31
}

/**
 * Advance the clock by one second, with full BCD carry into minutes,
 * hours, date/month/year, and weekday - i.e. what the real chip's
 * crystal does on its own, independent of whatever the CPU is doing.
 * Honours the CH (clock halt) bit: register 0 bit7 - if set, ticking is
 * a no-op, matching real hardware.
 */
DS1302.prototype.tick = function () {
    if (this.clock[0] & 0x80) return // CH set: oscillator halted

    let sec = ds1302_fromBCD(this.clock[0] & 0x7F) + 1
    if (sec >= 60) { sec = 0; this._incMinute() }
    this.clock[0] = (this.clock[0] & 0x80) | ds1302_toBCD(sec)
}

DS1302.prototype._incMinute = function () {
    let min = ds1302_fromBCD(this.clock[1] & 0x7F) + 1
    if (min >= 60) { min = 0; this._incHour() }
    this.clock[1] = ds1302_toBCD(min)
}

DS1302.prototype._incHour = function () {
    let hr = ds1302_fromBCD(this.clock[2] & 0x3F) + 1
    if (hr >= 24) { hr = 0; this._incDate() }
    this.clock[2] = ds1302_toBCD(hr) // stays in 24-hour mode (bit7=0)
}

DS1302.prototype._incDate = function () {
    let date = ds1302_fromBCD(this.clock[3])
    let month = ds1302_fromBCD(this.clock[4])
    let year = ds1302_fromBCD(this.clock[6])
    let weekday = ds1302_fromBCD(this.clock[5])

    date += 1
    weekday = (weekday % 7) + 1
    if (date > this._daysInMonth(month, year)) {
        date = 1
        month += 1
        if (month > 12) { month = 1; year = (year + 1) % 100 }
    }

    this.clock[3] = ds1302_toBCD(date)
    this.clock[4] = ds1302_toBCD(month)
    this.clock[5] = ds1302_toBCD(weekday)
    this.clock[6] = ds1302_toBCD(year)
}

/**
 * Make it self-running: ticks once a second on the wall clock,
 * independent of the CPU's execute loop - a real DS1302 runs off its
 * own crystal, not the 80C552's clock. Returns the interval handle;
 * call stopClock() (or clearInterval yourself) to stop it. Node and
 * browser both support this signature.
 */
DS1302.prototype.startClock = function (intervalMs = 1000) {
    this.stopClock()
    this._timer = setInterval(() => this.tick(), intervalMs)
    return this._timer
}

DS1302.prototype.stopClock = function () {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
}

DS1302.prototype._beginTransaction = function () {
    this._phase = "cmd"; this._bitPos = 0; this._cmdByte = 0
}

DS1302.prototype._decodeCmd = function () {
    const c = this._cmdByte
    const isRam = !!(c & 0x40)
    const addr5 = (c >> 1) & 0x1F
    const isRead = !!(c & 0x01)
    const burst = addr5 === 0x1F
    this._target = { isRam, addr: burst ? 0 : addr5, burst }
    this._phase = isRead ? "read" : "write"
    this._bitPos = 0
    this._dataByte = 0
    this._suppressNextFall = true // the trailing fall of the same clock
    // pulse that just clocked in the 8th command bit shouldn't also
    // consume the first read/write bit - most bitbang drivers issue a
    // uniform rise+fall per bit and don't special-case the command/data
    // boundary, so the model has to tolerate that extra fall.
    if (isRead) this._loadOutByte()
}

DS1302.prototype._loadOutByte = function () {
    const arr = this._regArray()
    const v = arr[this._target.addr] ?? 0
    this._dataByte = v
    this._outBit = this._dataByte & 1
}

DS1302.prototype._advanceAfterByte = function () {
    if (this._target.burst) {
        this._target.addr++
        this._bitPos = 0
        if (this._phase === "read") this._loadOutByte()
        else this._dataByte = 0
    } else {
        this._phase = "cmd"; this._bitPos = 0; this._cmdByte = 0
    }
}

DS1302.prototype.sclkRise = function (ioBit) {
    if (this._phase === "cmd") {
        this._cmdByte |= (ioBit & 1) << this._bitPos
        if (++this._bitPos === 8) this._decodeCmd()
    } else if (this._phase === "write") {
        this._dataByte |= (ioBit & 1) << this._bitPos
        if (++this._bitPos === 8) {
            this._regArray()[this._target.addr] = this._dataByte
            this._advanceAfterByte()
        }
    }
    // "read" phase: DS1302 drives on the falling edge, not here
}

DS1302.prototype.sclkFall = function () {
    if (this._suppressNextFall) { this._suppressNextFall = false; return }
    if (this._phase !== "read") return
    if (++this._bitPos === 8) { this._advanceAfterByte(); return }
    this._outBit = (this._dataByte >> this._bitPos) & 1
}

DS1302.prototype.ceRise = function () { this._beginTransaction() }
DS1302.prototype.ceFall = function () { this._phase = "idle" }

/**
 * @param {_51cpu} cpu
 * @param {DS1302} dev
 * @param {{ce: {port:reg, bit:number}, sclk: {port:reg, bit:number}, io: {port:reg, bit:number}}} pins
 *   Each pin is independently assignable to any port - CE on P1.0, SCLK
 *   on P3.5, IO on P0.2, whatever your board actually wires.
 */
function install_ds1302(cpu, dev, pins) {
    const { ce, sclk, io } = pins
    watchPin(ce.port, ce.bit, { onRise: () => dev.ceRise(), onFall: () => dev.ceFall() })
    watchPin(sclk.port, sclk.bit, {
        onRise: () => dev.sclkRise(readPinLatch(io.port, io.bit)),
        onFall: () => dev.sclkFall(),
    })
    drivePinInput(io.port, io.bit, () => dev._phase === "read" ? dev._outBit : readPinLatch(io.port, io.bit))
}

// ============================================================
// 74HC4094 - serial-in, parallel-out shift register (firmware writes)
// ============================================================
// DATA sampled on each CLK rising edge, shifted MSB-first into an 8-bit
// shift register; STROBE rising edge latches it to the (8-bit) output
// bus, read back as device.outputs.
function ShiftOut4094() {
    this.shiftReg = 0
    this.outputs = 0 // latched parallel output byte
}

/**
 * @param {{data:{port,bit}, clk:{port,bit}, str:{port,bit}}} pins
 */
function install_4094(cpu, dev, pins) {
    const { data, clk, str } = pins
    watchPin(clk.port, clk.bit, {
        onRise: () => { dev.shiftReg = ((dev.shiftReg << 1) | readPinLatch(data.port, data.bit)) & 0xFF },
    })
    watchPin(str.port, str.bit, {
        onRise: () => { dev.outputs = dev.shiftReg },
    })
}

// ============================================================
// CD4021 - parallel-in, serial-out shift register (firmware reads)
// ============================================================
// While PL (parallel load) is high, the internal register continuously
// tracks dev.inputs (set that from your simulated sensors/switches).
// PL falling edge freezes it; each CLK rising edge afterwards shifts it
// left and the current MSB is what's on Q8, which is what the port's
// serial-in pin reads.
function ShiftIn4021() {
    this.inputs = 0  // set this (0-255) to your simulated parallel inputs
    this.shiftReg = 0
}

/**
 * @param {{pl:{port,bit}, clk:{port,bit}, q:{port,bit}}} pins
 */
function install_4021(cpu, dev, pins) {
    const { pl, clk, q } = pins
    watchPin(pl.port, pl.bit, {
        onRise: () => { dev.shiftReg = dev.inputs & 0xFF },
    })
    watchPin(clk.port, clk.bit, {
        onRise: () => { dev.shiftReg = (dev.shiftReg << 1) & 0xFF },
    })
    drivePinInput(q.port, q.bit, () => (dev.shiftReg >> 7) & 1)
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        watchPin, readPinLatch, drivePinInput,
        DS1302, install_ds1302,
        ShiftOut4094, install_4094,
        ShiftIn4021, install_4021,
    }
}
