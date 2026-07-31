/**
 * i2c_bus.js
 *
 * Drives the 80C552's on-chip I2C-bus controller (SIO1: S1CON/S1STA/
 * S1DAT/S1ADR) as an I2C **master**, and lets you attach virtual slave
 * devices to it by 7-bit address. Slave mode (the 80C552 responding to
 * someone else's START) is not implemented - see the note at the bottom
 * if you need that instead.
 *
 * ---- How the real hardware's protocol maps to events here ----
 *
 * S1CON bits:  CR2(7) ENS1(6) STA(5) STO(4) SI(3) AA(2) CR1(1) CR0(0)
 *
 * Firmware drives the bus by setting STA/STO/AA and writing S1DAT, then
 * clearing SI to tell the hardware "go". The hardware performs one bus
 * action, updates S1STA with a status code, sets SI again, and waits.
 * This module reproduces that handshake synchronously (no real bus
 * timing) by listening on S1CON.setlistener for exactly those two
 * events:
 *
 *   STA 0->1   -> issue (repeated) START, status 0x08, SI=1
 *   SI  1->0   -> "go": perform whatever the current FSM state implies
 *                 (send address+R/W, send/receive a data byte, ...),
 *                 update status, SI=1 again
 *   STO 0->1   -> issue STOP, auto-clear STO, status 0xF8, no SI pulse
 *                 (matches real hardware - STOP does not raise SI)
 *
 * Status codes implemented (master mode only):
 *   0x08  START transmitted
 *   0x10  repeated START transmitted
 *   0x18  SLA+W sent, ACK received      0x20  SLA+W sent, NACK received
 *   0x28  data sent, ACK received       0x30  data sent, NACK received
 *   0x40  SLA+R sent, ACK received      0x48  SLA+R sent, NACK received
 *   0x50  data received, ACK returned   0x58  data received, NACK returned (last byte)
 *   0xF8  idle / no relevant state
 *
 * These match the standard Philips/NXP I2C-bus status table used across
 * the 80C51 I2C-equipped derivatives; double-check against your own
 * datasheet copy if you need bit-exact behaviour for timing-sensitive
 * firmware (arbitration-lost / bus-error codes aren't modeled - there's
 * only ever one master here).
 */

const I2C_BIT = { CR2: 0x80, ENS1: 0x40, STA: 0x20, STO: 0x10, SI: 0x08, AA: 0x04, CR1: 0x02, CR0: 0x01 }

/**
 * A virtual I2C slave device. Implement whichever of these your device
 * needs - see RegisterAddressedDevice below for a ready-made pattern
 * that covers most simple sensors/EEPROMs/RTCs.
 *
 * @typedef {Object} I2CDevice
 * @property {(isRead: boolean) => boolean} start
 *   Called when this device's address is put on the bus. Return true to
 *   ACK (device present, ready), false to NACK.
 * @property {(byte: number) => boolean} write
 *   Master is sending a byte to this device. Return true to ACK.
 * @property {() => number} read
 *   Master is clocking a byte out of this device (0-255).
 * @property {() => void} [stop]
 *   Called on STOP while this device was the active target. Optional.
 */

function I2CBus() {
    this.devices = new Map() // 7-bit address -> I2CDevice
}

I2CBus.prototype.attach = function (address7, device) {
    if (address7 < 0 || address7 > 0x7F) throw new RangeError("I2C address must be 0-0x7F")
    this.devices.set(address7, device)
    return device
}

I2CBus.prototype.detach = function (address7) {
    this.devices.delete(address7)
}

/**
 * Wire the bus controller's master state machine into cpu.S1CON /
 * S1STA / S1DAT. Requires install_80c552_peripherals(cpu) to have run
 * first.
 *
 * @param {_51cpu} cpu
 * @param {I2CBus} bus
 */
function install_i2c_master(cpu, bus) {
    const S1CON = cpu.S1CON
    const S1STA = cpu.S1STA
    const S1DAT = cpu.S1DAT

    // internal FSM, not visible as an SFR - mirrors what real SIO1
    // hardware tracks internally between SI pulses
    let fsm = "idle"        // idle | addr-pending | tx | rx
    let activeAddr = -1
    let activeDevice = null

    function setStatus(code) { S1STA._value = code & 0xFF }
    function setSI() { S1CON._value = S1CON._value | I2C_BIT.SI }

    S1CON.setlistener.push((oldval, newval) => {
        if (!(newval & I2C_BIT.ENS1)) return // SIO1 disabled: ignore bus activity

        const staRising = (newval & I2C_BIT.STA) && !(oldval & I2C_BIT.STA)
        const siFalling = !(newval & I2C_BIT.SI) && (oldval & I2C_BIT.SI)
        const stoRising = (newval & I2C_BIT.STO) && !(oldval & I2C_BIT.STO)

        if (stoRising) {
            if (activeDevice && activeDevice.stop) activeDevice.stop()
            fsm = "idle"; activeDevice = null; activeAddr = -1
            setStatus(0xF8)
            S1CON._value = newval & ~I2C_BIT.STO // hardware auto-clears STO
            return
        }

        if (staRising) {
            // (repeated) START - real hardware distinguishes 0x08 vs 0x10
            // only when a transfer was already in progress
            const repeated = fsm !== "idle"
            fsm = "addr-pending"
            activeDevice = null; activeAddr = -1
            setStatus(repeated ? 0x10 : 0x08)
            setSI()
            return
        }

        if (siFalling) {
            const aa = newval & I2C_BIT.AA

            if (fsm === "addr-pending") {
                const slaByte = S1DAT.get()
                const addr7 = (slaByte >> 1) & 0x7F
                const isRead = (slaByte & 0x01) === 1
                const dev = bus.devices.get(addr7)
                const ack = dev ? dev.start(isRead) : false

                if (ack) {
                    activeDevice = dev; activeAddr = addr7
                    fsm = isRead ? "rx" : "tx"
                    setStatus(isRead ? 0x40 : 0x18)
                } else {
                    fsm = "idle"
                    setStatus(isRead ? 0x48 : 0x20)
                }
                setSI()
                return
            }

            if (fsm === "tx") {
                const byte = S1DAT.get()
                const ack = activeDevice ? activeDevice.write(byte) : false
                setStatus(ack ? 0x28 : 0x30)
                setSI()
                return
            }

            if (fsm === "rx") {
                const byte = activeDevice ? activeDevice.read() : 0xFF
                S1DAT._value = byte & 0xFF
                setStatus(aa ? 0x50 : 0x58)
                setSI()
                return
            }
        }
    })

    cpu.i2c = { bus, I2C_BIT }
    return bus
}

/**
 * Ready-made virtual device pattern covering most simple I2C peripherals
 * (EEPROMs, RTCs, sensors with a register file): first byte written
 * after START sets an internal register pointer; subsequent writes
 * store to registers[pointer++]; a read (after repeated START, or a
 * fresh START on this address) streams registers[pointer++] outward.
 * Pointer wraps at `registers.length`.
 *
 * Usage:
 *   const eeprom = new RegisterAddressedDevice(256) // 256-byte EEPROM
 *   bus.attach(0x50, eeprom)
 *   eeprom.registers[0x00] = 0x42 // pre-seed contents if useful
 */
function RegisterAddressedDevice(size = 256) {
    this.registers = new Uint8Array(size)
    this._ptr = 0
    this._awaitingPointerByte = false
}

RegisterAddressedDevice.prototype.start = function (isRead) {
    // a fresh/repeated START always ACKs; if it's a write, the very
    // next byte is treated as the register pointer, not data
    this._awaitingPointerByte = !isRead
    return true
}

RegisterAddressedDevice.prototype.write = function (byte) {
    if (this._awaitingPointerByte) {
        this._ptr = byte % this.registers.length
        this._awaitingPointerByte = false
        return true
    }
    this.registers[this._ptr] = byte & 0xFF
    this._ptr = (this._ptr + 1) % this.registers.length
    return true
}

RegisterAddressedDevice.prototype.read = function () {
    const v = this.registers[this._ptr]
    this._ptr = (this._ptr + 1) % this.registers.length
    return v
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { I2CBus, install_i2c_master, RegisterAddressedDevice, I2C_BIT }
}
