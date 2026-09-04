// ============================================================
// CD4021 - parallel-in, serial-out shift register (firmware reads)
// ============================================================
// While PL (parallel load) is high, the internal register continuously
// tracks dev.inputs (set that from your simulated sensors/switches).
// PL falling edge freezes it; each CLK rising edge afterwards shifts it
// left and the current MSB is what's on Q8, which is what the port's
// serial-in pin reads.
function ShiftIn4021() {
    this.shiftReg = 0
    this._bitPos = 0;
    this._phaseCount = 0;
    this._timer = null;
    this.phaseTicks = 0;
    this.phaseStep = 0;
    this.inputs = 0x00;
}

/**
 * @param {{pl:{port,bit}, clk:{port,bit}, q:{port,bit}}} pins
 */

function install_4021(cpu, dev, pins) {
    const { pl, clk, q } = pins
    watchPin(pl.port, pl.bit, {
        onRise: () => { 
            dev.shiftReg = dev.inputs & 0xFF
        },
        onFall: () => { 
            
        }
    })
    watchPin(clk.port, clk.bit, {
        onRise: () => { 
            dev.shiftReg = (dev.shiftReg << 1) & 0xFF
            
        },
    })
    drivePinInput(q.port, q.bit, () => (dev.shiftReg >> 7) & 1);
}