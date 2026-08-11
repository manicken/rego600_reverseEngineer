// ============================================================
// 74HC4094 - serial-in, parallel-out shift register (firmware writes)
// ============================================================
// DATA sampled on each CLK rising edge, shifted MSB-first into an 8-bit
// shift register; STROBE rising edge latches it to the (8-bit) output
// bus, read back as device.outputs.
function ShiftOut4094() {
    this.shiftReg = 0
    this.outputs = new reg(); // reuse 51vm_core register structure here
    this.QS1 = new reg(0, 1); // create a register with one bit, here only used as a transport layer
    this.QS2 = new reg(0, 1); // create a register with one bit, here only used as a transport layer
}

/**
 * @param {{data:{port,bit}, clk:{port,bit}, str:{port,bit}}} pins
 */
function install_4094(cpu, dev, pins, tag) {
    const { data, clk, str } = pins
    watchPin(clk.port, clk.bit, {
        onRise: () => { 
            dev.shiftReg = ((dev.shiftReg << 1) | readPortPin(data)) & 0xFF;
            dev.QS1.set((dev.shiftReg & 0x80) ? 1 : 0);
        },
        onFall: () => {
            dev.QS2.set(dev.QS1.get()); // to simulate real HW this should be set when clk is low
        }
    })
    watchPin(str.port, str.bit, {
        onRise: () => { 
            dev.outputs.set(dev.shiftReg);
            console.log(`4094 ${tag} latched:${hex(dev.shiftReg,4)}`);
        },
    })
}
