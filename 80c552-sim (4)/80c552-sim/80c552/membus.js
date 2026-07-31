/**
 * membus.js
 *
 * Models the board's external-bus glue logic: the 62256 SRAM and the
 * AM29F040 flash share the CPU's external address/data bus but are never
 * enabled at the same time. Which one is "connected" is chosen by a
 * GPIO-driven bank-select line, and the flash's 3 extra address lines
 * (A16-A18, beyond the 8051's native 16-bit external bus) are also
 * manually driven from GPIO - all on Port 4 by default, matching the
 * hardware description this simulator is built for.
 *
 * This works by replacing cpu.get_XRAM_cell (the one hook point js51
 * exposes for every MOVX access, see 51vm_operand.js) with a bus
 * controller that:
 *   1. reads the current P4 output-latch value directly (bypassing any
 *      getlistener side effects - this is a GPIO *output* from the CPU's
 *      point of view, not an input we're simulating),
 *   2. decodes the bank-select bit and the 3 extra address bits from it,
 *   3. dispatches the 16-bit MOVX address to the SRAM or the flash
 *      device, extending it with the GPIO address bits for the flash.
 *
 * Default pin assignment (all on P4, override via opts):
 *   P4.0            -> bank select   (0 = SRAM enabled, 1 = flash enabled)
 *   P4.1, P4.2, P4.3 -> A16, A17, A18 (flash's extra address lines)
 * That's a documented assumption, not a datasheet fact - P4 on the real
 * 80C552 has alternate functions (CMSR0-5/CMT0-1 for Timer T2) that this
 * board's design is evidently not using for those bits; adjust
 * bankSelectBit / addrExtBits below to match your schematic if different.
 */

function install_external_bus(cpu, opts = {}) {
    const bankSelectBit = opts.bankSelectBit ?? 0
    const addrExtBits = opts.addrExtBits ?? [1, 2, 3] // -> A16, A17, A18 in that order
    const sramSize = opts.sramSize ?? 0x8000
    const flashImage = opts.flashImage ?? null

    const sram = new SRAM62256(sramSize)
    const flash = new AM29F040(flashImage)

    const P4 = cpu.P4
    if (!P4) throw new Error("install_external_bus: cpu.P4 not found - run install_80c552_peripherals(cpu) first")

    function readP4Latch() {
        // direct read of the output latch, no getlistener side effects
        return P4._value
    }

    cpu.bus = {
        sram,
        flash,
        bankSelectBit,
        addrExtBits,
        readSelect() {
            const p4 = readP4Latch()
            const bank = (p4 >> bankSelectBit) & 0x01
            let ext = 0
            addrExtBits.forEach((bit, i) => { ext |= ((p4 >> bit) & 0x01) << i })
            return { bank, ext } // bank: 0 = SRAM, 1 = flash
        },
    }

    cpu.get_XRAM_cell = function (addr16) {
        const { bank, ext } = cpu.bus.readSelect()

        if (bank === 1) {
            const fullAddr = (ext << 16) | (addr16 & 0xFFFF)
            return {
                get: () => flash.read(fullAddr),
                set: (val) => flash.write(fullAddr, val),
            }
        } else {
            // 62256 only has 15 address lines (32KB); GPIO address
            // extension bits are meaningless to it and ignored.
            const fullAddr = addr16 & (sramSize - 1)
            return {
                get: () => sram.read(fullAddr),
                set: (val) => sram.write(fullAddr, val),
            }
        }
    }

    return cpu.bus
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { install_external_bus }
}
