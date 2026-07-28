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
 P4.0 -> AM29F040 CS#
P4.2 -> 62256 CS#

P3.3 -> AM29F040 A16
P3.5 -> AM29F040 A17
P3.4 -> AM29F040 A18
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
	const P3 = cpu.P3

	if (!P4 || !P3)
		throw new Error("install_external_bus: ports missing")

	function readP4Latch() {
		return P4._value
	}

	function readP3Latch() {
		return P3._value
	}

    cpu.bus = {
        sram,
        flash,
        bankSelectBit,
        addrExtBits,
        readSelect() {
			const p4 = readP4Latch()
			const p3 = readP3Latch()

			const flashCS = ((p4 >> 0) & 1) === 0   // CS# aktiv låg
			const sramCS  = ((p4 >> 2) & 1) === 0   // CS# aktiv låg

			let ext = 0

			// A16=P3.3
			ext |= ((p3 >> 3) & 1) << 0

			// A17=P3.5
			ext |= ((p3 >> 5) & 1) << 1

			// A18=P3.4
			ext |= ((p3 >> 4) & 1) << 2

			return {
				flashCS,
				sramCS,
				ext
			}
		},
    }

    cpu.get_XRAM_cell = function(addr16) {
		const {flashCS, sramCS, ext} = cpu.bus.readSelect()

		if (flashCS) {
			const fullAddr = (ext << 16) | addr16

			return {
				get: () => flash.read(fullAddr),
				set: (val) => flash.write(fullAddr, val)
			}
		}

		if (sramCS) {
			const fullAddr = addr16 & (sramSize - 1)

			return {
				get: () => sram.read(fullAddr),
				set: (val) => sram.write(fullAddr, val)
			}
		}

		// ingen krets vald
		return {
			get: () => 0xff,
			set: () => {}
		}
	}

    return cpu.bus
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { install_external_bus }
}
