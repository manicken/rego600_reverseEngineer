/**
 * device_am29f040.js
 *
 * Model of an AM29F040(B) 512K x 8 (4 Mbit) CMOS flash, covering the
 * standard AMD/Fujitsu JEDEC command set:
 *   - read array (default state)
 *   - autoselect / ID read (manufacturer 0x01, device 0xA4)
 *   - byte program (0xAA@0x5555, 0x55@0x2AAA, 0xA0@0x5555, data@addr)
 *   - chip erase   (...0x80@0x5555, 0xAA@0x5555, 0x55@0x2AAA, 0x10@0x5555)
 *   - sector erase (...0x80@0x5555, 0xAA@0x5555, 0x55@0x2AAA, 0x30@sector)
 *   - software reset (0xF0 at any address, or 0xAA/0x55/0xF0)
 *
 * Simplifications vs a real chip:
 *   - Program/erase complete instantly (no tWC/tBP/tSCE timing). A
 *     firmware DQ7 data-polling or DQ6 toggle-bit loop will see the
 *     "finished" state on its very first read, which is a correct
 *     end-state even though the real latency isn't modeled.
 *   - Unlock-cycle address matching uses the low 11 bits (addr & 0x7FF)
 *     against 0x555/0x2AA, which is the common simplification used by
 *     most 29F0x0-family parts regardless of total capacity.
 *   - Sector size is fixed at 64KB (8 sectors across the 512KB array),
 *     matching the AM29F040's uniform sector layout.
 *   - No erase-suspend/resume, no sector protection/unprotection, no
 *     write-protect pin. Add if your target board actually uses them.
 *
 * Programming can only clear bits (1 -> 0); mem[addr] &= val, matching
 * real NOR flash behaviour. Erase sets bytes back to 0xFF.
 */
function AM29F040(initialImage) {
    this.size = 0x80000 // 512KB, 19 address lines (A0-A18)
    this.sectorSize = 0x10000 // 64KB, 8 sectors
    this.mfgId = 0x01  // AMD
    this.devId = 0xA4  // AM29F040

    this.mem = new Uint8Array(this.size).fill(0xFF)
    if (initialImage) this.loadImage(initialImage)

    this.step = 0
    this.mode = "read" // "read" | "autoselect" | "program" | "erase-armed"
}

AM29F040.prototype.loadImage = function (bytes) {
    for (let i = 0; i < bytes.length && i < this.size; ++i) this.mem[i] = bytes[i] & 0xFF
}

AM29F040.prototype._resetToStep0 = function () {
    this.step = 0
}

AM29F040.prototype.softReset = function () {
    this.step = 0
    this.mode = "read"
}

AM29F040.prototype.read = function (addr, logReads = true) {
    addr &= (this.size - 1)
    if (this.mode === "autoselect") {
        const off = addr & 0xFF
        if (off === 0x00) return this.mfgId
        if (off === 0x01) return this.devId
    }
    let val = this.mem[addr];
    if (addr >= 0x40000 && logReads) {
    //console.log(`am29f040 - read text ${hex(val)} @ ${hex(addr)}`);
    }

    if (addr >= 0x30000 && addr < 0x40000 && logReads) {
    console.log(`am29f040 - read 0x30000 sector ${hex(val)} @ ${hex(addr)}`);
    }
     
    return val;
}

AM29F040.prototype.write = function (addr, val) {
    addr &= (this.size - 1)
    val &= 0xFF
    const a = addr & 0x7FF // unlock cycles only decode the low 11 bits

    // universal escape hatch: 0xF0 anywhere drops back to read mode
    if (val === 0xF0 && this.step === 0) {
        this.mode = "read"
        return
    }

    switch (this.step) {
        case 0:
            if (a === 0x555 && val === 0xAA) { this.step = 1 } else { this._resetToStep0() }
            return

        case 1:
            if (a === 0x2AA && val === 0x55) { this.step = 2 } else { this._resetToStep0() }
            return

        case 2:
            if (a === 0x555 && val === 0x90) {
                this.mode = "autoselect"; this._resetToStep0()
            } else if (a === 0x555 && val === 0xA0) {
                this.mode = "program"; this.step = 3
            } else if (a === 0x555 && val === 0x80) {
                this.mode = "erase-armed"; this.step = 3
            } else if (a === 0x555 && val === 0xF0) {
                this.mode = "read"; this._resetToStep0()
            } else {
                this._resetToStep0()
            }
            return

        case 3:
            if (this.mode === "program") {
                this.mem[addr] &= val // flash can only clear bits when programming
                if (addr < 0x10000) { // only log settings
                    console.log(`am29f040 - write ${hex(val)} @ ${hex(addr)}`);
                    console.log(cpu.getCallStackString());
                }
                this.mode = "read"
                this._resetToStep0()
            } else if (this.mode === "erase-armed") {
                if (a === 0x555 && val === 0xAA) { this.step = 4 } else { this._resetToStep0(); this.mode = "read" }
            } else {
                this._resetToStep0()
            }
            return

        case 4:
            if (this.mode === "erase-armed") {
                if (a === 0x2AA && val === 0x55) { this.step = 5 } else { this._resetToStep0(); this.mode = "read" }
            } else {
                this._resetToStep0()
            }
            return

        case 5:
            if (this.mode === "erase-armed") {
                if (a === 0x555 && val === 0x10) {
                    this.mem.fill(0xFF) // chip erase
                    this.mode = "read"; this._resetToStep0()
                } else if (val === 0x30) {
                    console.log("29f040 sector erase happend");
                    const sectorStart = addr - (addr % this.sectorSize)
                    this.mem.fill(0xFF, sectorStart, sectorStart + this.sectorSize)
                    this.mode = "read"; this._resetToStep0()
                } else {
                    this.mode = "read"; this._resetToStep0()
                }
            } else {
                this._resetToStep0()
            }
            return
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { AM29F040 }
}
