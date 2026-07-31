/**
 * 80c552_adc.js
 *
 * Simulates the 80C552's on-chip 8-channel, 10-bit successive-approximation
 * ADC (P5.0-P5.7 = ADC0-ADC7).
 *
 * ADCON (0xC5): bit7 ADC.1 | bit6 ADC.0 | bit5 ADEX | bit4 ADCI |
 *               bit3 ADCS | bit2:0 AADR2:0 (channel select)
 * ADCH  (0xC6): upper 8 bits of the 10-bit result
 *
 * Software starts a conversion by setting ADCS (bit3). Real hardware takes
 * 50 machine cycles and then sets ADCI (bit4) and clears ADCS. Since this
 * is an instruction-level simulator with no real analog front end, the
 * conversion completes synchronously on the write that sets ADCS - any
 * firmware polling loop on ADCI/ADCS will see it "done" the next time it
 * reads ADCON, which is the behaviourally-correct outcome even though the
 * 50-cycle latency itself isn't modeled.
 *
 * Requires install_80c552_peripherals(cpu) to have run first (needs ADCON,
 * ADCH, P5).
 */

function install_80c552_adc(cpu, opts = {}) {
    const ADCON = cpu.ADCON
    const ADCH = cpu.ADCH
    const vref = opts.vref ?? 5.12 // AVREF+, per datasheet default test condition

    const adc = {
        vref: vref,
        // one analog voltage per channel (P5.0..P5.7 / ADC0..ADC7)
        channels: opts.channels ? opts.channels.slice(0, 8) : [0, 0, 0, 0, 0, 0, 0, 0],

        setChannelVoltage(ch, volts) {
            if (ch < 0 || ch > 7) throw new RangeError("ADC channel must be 0-7")
            this.channels[ch] = Math.max(0, Math.min(this.vref, volts))
        },

        getChannelVoltage(ch) {
            return this.channels[ch]
        },

        // convert channel `ch` right now and return the raw 10-bit code
        convert(ch) {
            const v = this.channels[ch] ?? 0
            let code = Math.round((v / this.vref) * 1023)
            if (code < 0) code = 0
            if (code > 1023) code = 1023
            return code
        },
    }

    ADCON.setlistener.push((oldval, newval) => {
        const ADCS_BIT = 0x08
        const wasRunning = oldval & ADCS_BIT
        const startRequested = newval & ADCS_BIT

        if (startRequested && !wasRunning) {
            const channel = newval & 0x07
            const code = adc.convert(channel)
            const hi8 = (code >> 2) & 0xFF     // -> ADCH
            const lo2 = code & 0x03            // -> ADCON.7:6 (ADC.1, ADC.0)

            ADCH._value = hi8 // direct write: avoid re-entering ADCH's own listeners

            // Result: ADCI=1 (done), ADCS=0 (conversion finished), channel
            // bits preserved, top two bits carry the low 2 result bits.
            // Written directly to _value (not via .set()) so we don't
            // re-enter this same setlistener while it's still running -
            // the conversion completes synchronously/instantly, which is
            // the correct end state even though real hardware takes 50
            // machine cycles to get there.
            ADCON._value = (lo2 << 6) | 0x10 | (newval & 0x07)
        }
    })

    cpu.adc = adc
    return adc
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { install_80c552_adc }
}
