/**
 * device_62256.js
 *
 * Trivial model of a 62256 32K x 8 static RAM. No command protocol, no
 * timing, no wear - just a byte array. Reads of never-written cells return
 * 0x00 (real SRAM would be undefined/noise on power-up, but 0x00 is a more
 * useful simulator default).
 */
function SRAM62256(size = 0x8000) {
    this.size = size
    this.mem = new Uint8Array(size)
    this.mem_read_use_map = new Uint32Array(size);
    this.mem_write_use_map = new Uint32Array(size);
}

SRAM62256.prototype.read = function (addr) {
    /*if (addr >= 0x12FC && addr <= 0x132B) {
        console.log("read GT2 curve data" + cpu.getCallStackString());
    }
    if (addr >= 0x1368 && addr <= 0x1369) {
        console.log(
            `setting 0x3E read: addr=0x${addr.toString(16)}, ` +
            `value=0x${this.mem[addr & (this.size - 1)].toString(16)}` +
            '\n' + cpu.getCallStackString()
        );
    }*/
   this.mem_read_use_map[addr & (this.size - 1)]++;
    return this.mem[addr & (this.size - 1)]
}

SRAM62256.prototype.write = function (addr, val) {
    /*if (addr >= 0x1368 && addr <= 0x1369) {
        console.log(
            `setting 0x3E write: addr=0x${addr.toString(16)}, ` +
            `value=0x${val.toString(16)}` +
            '\n' + cpu.getCallStackString()
        );
    }*/
    /*if (addr == 0x13d0) {
        console.log(`0x13d0 write happend - new value (${val}):\n` + cpu.getCallStackString());
    } else if (addr == 0x1c16 || addr == 0x1c17) {
        console.log(`0x1c16 or 0x1c17 write happend - new value (${val}):\n` + cpu.getCallStackString());
    }*/
    if (addr == 0x100 && this.mem_write_use_map[addr & (this.size - 1)] < 4) {
        console.log(
            `xram write: addr=0x${addr.toString(16)}, ` +
            `value=0x${val.toString(16)}` +
            '\n' + cpu.getCallStackString()
        );
    }
    this.mem_write_use_map[addr & (this.size - 1)]++;
    this.mem[addr & (this.size - 1)] = val & 0xFF
}

SRAM62256.prototype.loadImage = function (bytes) {
    for (let i = 0; i < bytes.length && i < this.size; ++i) this.mem[i] = bytes[i] & 0xFF
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SRAM62256 }
}
