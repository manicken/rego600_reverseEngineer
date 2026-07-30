/**
 * 80c552.js
 *
 * One-call factory: create_80c552(opts) returns a fully wired js51 `_51cpu`
 * instance - real 80C552 SFR map, extended interrupt controller, ADC, and
 * the GPIO-driven SRAM/flash external memory bank swap.
 *
 * Load order (script tags or require, in this order):
 *   vendor/51vm_core.js
 *   vendor/51vm_operand.js
 *   vendor/51vm_operation.js
 *   vendor/51vm_opcode_decoder.js
 *   vendor/51vm_ctl.js
 *   vendor/hex_decoder.js
 *   80c552/80c552_sfr.js
 *   80c552/80c552_adc.js
 *   80c552/device_62256.js
 *   80c552/device_am29f040.js
 *   80c552/membus.js
 *   80c552/i2c_bus.js   (optional - only if you're using I2C)
 *   80c552/80c552.js   <- this file
 *
 * (vendor/51vm_peripheral.js is NOT loaded - it installs the plain-8051
 * SFR set that 80c552_sfr.js replaces entirely.)
 */

/**
 * @param {Object} opts
 * @param {number} [opts.iramSize=0x100]
 * @param {Uint8Array|number[]} [opts.flashImage]  initial AM29F040 contents
 * @param {number} [opts.sramSize=0x8000]
 * @param {number} [opts.bankSelectBit=0]  P4 bit used as SRAM/flash select
 * @param {number[]} [opts.addrExtBits=[1,2,3]]  P4 bits used as A16-A18
 * @param {number} [opts.adcVref=5.12]
 * @param {number[]} [opts.adcChannels]  initial analog voltage per channel
 * @param {I2CBus} [opts.i2cBus]  pass an I2CBus (see i2c_bus.js) to enable
 *   the on-chip I2C master; omit to leave S1CON/S1STA/S1DAT as inert SFRs
 * @returns {_51cpu}
 */
function create_80c552(opts = {}) {
    const cpu = new _51cpu(opts.iramSize ?? 0x100, 0x10000);
	
	

    install_80c552_peripherals(cpu)

    install_80c552_adc(cpu, {
        vref: opts.adcVref,
        channels: opts.adcChannels,
    })

    install_external_bus(cpu, {
        bankSelectBit: opts.bankSelectBit,
        addrExtBits: opts.addrExtBits,
        sramSize: opts.sramSize,
        flashImage: opts.flashImage,
    })

    if (opts.i2cBus) {
        install_i2c_master(cpu, opts.i2cBus);
		console.log("i2c master initierad");
    }
	
	/*cpu.interruptPending = {
		timer0: false,
		uart: false,
		i2c: false,
	};*/
	
	cpu.irq = function() {
    if (cpu.irqEmitters) {
        for (let i = 0; i < cpu.irqEmitters.length; i++) {
            let vector = cpu.irqEmitters[i]();

            if (vector >= 0) {
                return vector;
            }
        }
    }

    return -1;
}
	
	/*cpu.irq = function () {
		//console.log("interrupt check");
		if (cpu.interruptPending.i2c) {
			cpu.interruptPending.i2c = false;
			return 5; // vector number
		} else if (cpu.interruptPending.timer0) {
			cpu.interruptPending.timer0 = false;
			return 1; // vector number
		} else if (cpu.interruptPending.uart) {
			cpu.interruptPending.uart = false;
			return 4; // vector number
		}

		return -1;
	}*/

    return cpu
}

/** Convenience: load an Intel HEX string into internal ROM (IDATA). */
function load_ihex_into_idata(cpu, ihexText) {
    cpu.IDATA = decode_ihex(ihexText)
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { create_80c552, load_ihex_into_idata }
}
