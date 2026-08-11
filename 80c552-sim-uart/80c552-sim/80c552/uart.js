/**
 * uart.js
 *
 * Full byte-level UART for the 80C552's on-chip serial port (S0CON/
 * S0BUF, 0x98/0x99). Supports mode 1 (8-bit, the common case) and modes
 * 2/3 (9-bit, via TB8/RB8) well enough to drive a real service-port
 * protocol test - baud rate/timer generation itself isn't modeled
 * (byte events complete instantly, same instant-completion approach as
 * the ADC/flash/I2C in this package), but TI/RI, TB8/RB8, and REN all
 * behave like real hardware.
 *
 * SCON (S0CON) bits: SM0(7) SM1(6) SM2(5) REN(4) TB8(3) RB8(2) TI(1) RI(0)
 *
 * IMPORTANT hardware quirk this file has to account for: SBUF is really
 * *two* physical registers sharing one address - writes go to the TX
 * buffer, reads come from the RX buffer. A plain js51 reg can't do that
 * (get()/set() share one `_value`), so writes are caught via
 * setlistener (-> transmit) and reads are caught via getlistener, which
 * injects whatever was last received into `_value` right before the
 * read completes - same "getlistener mutates _value in place" pattern
 * used everywhere else in this package.
 */

function install_uart(cpu, opts = {}) {
    const SCON = cpu.S0CON
    const SBUF = cpu.S0BUF

    const SCON_BIT = { TI: 0x02, RI: 0x01, TB8: 0x08, RB8: 0x04, REN: 0x10, SM2: 0x20 }

    const uart = {
        txLog: [],           // every transmitted byte, in order: {byte, ninth}
        rxLog: [],           // every byte handed to rx(), in order
        _rxByte: 0,
        _rxQueue: [],        // bytes queued via rx()/rxBytes() waiting for RI to clear
        _txListeners: [],
        _rxListeners: [],    // fires when a queued byte is actually delivered into SBUF

        /** Register a callback for every byte the CPU transmits: (byte, ninthBit) => void */
        onTx(cb) { this._txListeners.push(cb); return cb },
        /** Register a callback for every byte actually delivered into SBUF: (byte, ninthBit) => void */
        onRxDelivered(cb) { this._rxListeners.push(cb); return cb },

        /**
         * Feed one received byte in. If the receiver is idle (RI already
         * clear), it's delivered immediately; otherwise it's queued and
         * delivered the moment firmware clears RI (mirrors a real UART
         * having no RX FIFO - one byte "in flight" at a time). `ninth`
         * is only meaningful in modes 2/3 (TB8/RB8) - omit for mode 1.
         */
        rx(byte, ninth = 0) {
            this.rxLog.push({ byte: byte & 0xFF, ninth: ninth & 1 })
            this._rxQueue.push({ byte: byte & 0xFF, ninth: ninth & 1 })
            this._pump()
        },
        rxBytes(bytes) { for (const b of bytes) this.rx(b) },

        _pump() {
            const scon = SCON.get()
            if (scon & SCON_BIT.RI) return // previous byte not yet consumed
            if (!(scon & SCON_BIT.REN)) return // receiver disabled
            const next = this._rxQueue.shift()
            if (!next) return

            this._rxByte = next.byte
            let newScon = (scon | SCON_BIT.RI) & ~SCON_BIT.RB8
            if (next.ninth) newScon |= SCON_BIT.RB8
            SCON._value = newScon // set RI (and RB8) without re-entering this listener

            for (const cb of this._rxListeners) cb(next.byte, next.ninth)
        },
    }

    // TX: writing SBUF sends a byte and (instantly) completes it
    SBUF.setlistener.push((oldval, newval) => {
        const ninth = (SCON.get() & SCON_BIT.TB8) ? 1 : 0
        uart.txLog.push({ byte: newval & 0xFF, ninth })
        for (const cb of uart._txListeners) cb(newval & 0xFF, ninth)
        SCON._value = SCON.get() | SCON_BIT.TI // hardware sets TI when tx completes
    })

    // RX: reading SBUF returns whatever was last received
    SBUF.getlistener.push(() => { SBUF._value = uart._rxByte })

    // whenever firmware clears RI (typically right after reading SBUF),
    // see if there's a queued byte ready to come in next
    SCON.setlistener.push((oldval, newval) => {
        const riCleared = (oldval & SCON_BIT.RI) && !(newval & SCON_BIT.RI)
        if (riCleared) uart._pump()
    })

    cpu.uart = uart
    return uart
}

// ============================================================
// Web Serial bridge (browser only) - lets an external tool (a real
// C++ driver, a terminal emulator, whatever can open a serial/COM
// port) talk to the simulated service port as if it were the real
// REGO600 hardware.
// ============================================================
/**
 * @param {Object} uart  cpu.uart from install_uart()
 * @param {SerialPort} port  an already-opened navigator.serial port
 *   (call `await port.open({baudRate: ...})` yourself first - the baud
 *   rate is between the OS and the physical/virtual COM port, this
 *   package doesn't model UART timing so it doesn't need to match
 *   anything the firmware configured)
 * @returns {{stop: () => Promise<void>}} call stop() to disconnect
 */
function connectWebSerialUart(uart, port) {
    const encoder = new TextEncoder() // unused, kept for symmetry - bytes go raw
    let stopped = false
    const writer = port.writable.getWriter()

    const offTx = uart.onTx((byte) => {
        if (stopped) return
        writer.write(new Uint8Array([byte])).catch(() => {})
    })

    const readLoop = (async () => {
        const reader = port.readable.getReader()
        try {
            while (!stopped) {
                const { value, done } = await reader.read()
                if (done) break
                if (value) for (const byte of value) uart.rx(byte)
            }
        } catch (e) {
            if (!stopped) throw e
        } finally {
            reader.releaseLock()
        }
    })()

    return {
        async stop() {
            stopped = true
            const idx = uart._txListeners.indexOf(offTx)
            if (idx >= 0) uart._txListeners.splice(idx, 1)
            try { writer.releaseLock() } catch (e) { /* ignore */ }
            try { await port.close() } catch (e) { /* ignore */ }
            await readLoop.catch(() => {})
        },
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { install_uart, connectWebSerialUart }
}
