// ============================================================
// TC1232 - watchdog timer (ST# strobe input)
// ============================================================
// Needs a pulse on ST within `timeoutMs` or it asserts reset. Real
// hardware runs this off its own RC/timing, independent of the CPU -
// same real-time approach as DS1302.startClock(). Triggers on either
// edge of ST (the datasheet's own strobe detector isn't edge-
// direction-specific) - fine for a pin that's also toggled for
// something else entirely, like a shared RTC chip-select.
function TC1232(opts = {}) {
    this.timeoutMs = opts.timeoutMs ?? 600 // set to match your board's WDS pin strapping
    this.lastStrobe = Date.now()
    this.resetCount = 0
    this.onReset = opts.onReset ?? null // fires (resetCount) if the timeout is missed
    this._timer = null
}

TC1232.prototype.strobe = function () { this.lastStrobe = Date.now() }
TC1232.prototype.msSinceStrobe = function () { return Date.now() - this.lastStrobe }

TC1232.prototype.startMonitoring = function (pollMs = 20) {
    this.stopMonitoring()
    this._timer = setInterval(() => {
        if (this.msSinceStrobe() > this.timeoutMs) {
            this.resetCount++
            this.lastStrobe = Date.now() // real chip resets, then starts timing again
            if (this.onReset) this.onReset(this.resetCount)
        }
    }, pollMs)
    return this._timer
}

TC1232.prototype.stopMonitoring = function () {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
}

/** @param {{st: {port, bit}}} pins */
function install_tc1232(cpu, dev, pins) {
    watchPin(pins.st.port, pins.st.bit, {
        onRise: () => dev.strobe(),
        onFall: () => dev.strobe(),
    })
}