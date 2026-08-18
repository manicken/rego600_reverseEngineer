// 51vm_disassembler.js
//
// Ren disassembler byggd som en spegling av 51vm_opcode_decoder.js:
// samma dispatch-träd (samma if/else-grenar i samma ordning), men istället
// för att köra operationen så bygger varje gren en textrad + räknar ut hur
// många bytes instruktionen tar.
//
// Läser ENDAST från en rå bytearray (t.ex. vm.IDATA) - rör aldrig
// vm.PC, IRAM, XRAM eller SFR-registren. Det är medvetet: att återanvända
// fetch_direct()/fetch_bit() från vm hade gått via get_ram_cell(), vilket
// kan trigga getlistener-sidoeffekter på riktiga SFR:er (t.ex. SBUF-pump).
// Disassemblern ska kunna köras fritt utan att störa en körande simulering.
//
// Beroende: inget. Fristående fil, kan laddas oavsett om resten av js51
// är laddat eller inte.

;(function (global) {

    // ---------- låg-nivå byte-läsning ----------

    function readByte(rom, addr) {
        if (addr < 0 || addr >= rom.length) return null
        let v = rom[addr]
        return (v === null || v === undefined) ? null : (v & 0xFF)
    }

    function hex2(v) {
        return "0x" + v.toString(16).toUpperCase().padStart(2, '0');// + 'H'
    }

    function hex4(v) {
        return "0x" + v.toString(16).toUpperCase().padStart(4, '0');// + 'H'
    }

    function signed8(v) {
        return (v & 0x80) ? (v - 256) : v
    }

    // ---------- symboliska namn ----------

    // sfr_map: samma sorts Map/objekt som vm.SFR (addr -> namn), t.ex.
    // { 0x80: "P0", 0x81: "SP", ... }. Byggs på med 80C552:s SFR:er av
    // anroparen. Frivilligt - saknas namn skrivs adressen ut i hex.
    function directName(addr, sfr_map) {
        if (addr < 0x80) return hex2(addr)
        let name = sfr_map ? sfr_map[addr] : undefined
        return name ? name : hex2(addr)
    }

    function RnName(opcode_value) {
        return 'R' + (opcode_value & 0x07)
    }

    function RiName(opcode_value) {
        return '@R' + (opcode_value & 0x01)
    }

    // formaterar en bit-adress enligt 8051-regeln:
    //  < 0x80 : bitadresserbart RAM,   byte = 0x20 + (bit>>3)
    //  >= 0x80: bitadresserbar SFR,    byte = bit & 0xF8
    function bitName(bit_addr, sfr_map) {
        let bit_index = bit_addr & 0x07
        let byte_addr
        if (bit_addr < 0x80) {
            byte_addr = 0x20 + (bit_addr >> 3)
            return hex2(byte_addr) + '.' + bit_index
        } else {
            byte_addr = bit_addr & 0xF8
            let name = sfr_map ? sfr_map[byte_addr] : undefined
            return (name ? name : hex2(byte_addr)) + '.' + bit_index
        }
    }

    // ---------- disassemble_one ----------
    //
    // rom: array-lik (kan innehålla null för luckor i intel-hex)
    // addr: startadress att avkoda från
    // sfr_map: (frivillig) addr->namn för SFR-register, för snyggare output
    //
    // Returnerar:
    //   { addr, length, bytes, mnemonic, text, next_addr, target }
    // - text: fullständig disassemblerad rad, t.ex. "MOV A,#42H"
    // - target: satt om instruktionen är ett hopp/anrop, = absolut måladress
    // - length/mnemonic: null om byte 0 var en lucka (null) i rom, eller
    //   opkoden inte kunde matchas (bör inte hända, tabellen är komplett
    //   för 8051 - men skyddar mot skräp/felaligned data)
    function disassemble_one(rom, addr, sfr_map) {
        sfr_map = sfr_map || {}
        let b0 = readByte(rom, addr)
        if (b0 === null) {
            return { addr, length: 1, bytes: [null], mnemonic: null,
                     text: 'DB ????', next_addr: addr + 1, target: null }
        }

        // hjälpare som bygger resultatet i slutet
        let bytes = [b0]
        let mnemonic = null
        let operands = ''
        let target = null

        function need(n) {
            // läser n extra bytes direkt efter det som redan konsumerats
            // (bytes.length inkluderar b0, så basen är alltid rätt även
            // efter flera need()-anrop i samma instruktion)
            let out = []
            for (let i = 0; i < n; i++) {
                let v = readByte(rom, addr + bytes.length)
                bytes.push(v)
                out.push(v)
            }
            return out
        }

        function relTarget(next_addr, offset_raw) {
            return (next_addr + signed8(offset_raw)) & 0xFFFF
        }

        // addr11 (AJMP/ACALL): samma formel som opcode.fetch_addr11() i
        // 51vm_operand.js, men räknad från den HÄR instruktionens next_addr
        // (dvs efter dess 2 bytes), inte via vm.PC.
        function addr11Target(b0val, byte1, next_addr) {
            let comb = ((b0val & 0xE0) << 3) + byte1
            comb += (next_addr & 0xF800)
            return comb
        }

        if ((b0 & 0x1F) === 0x01) {
            // AJMP addr11
            let [lo] = need(1)
            let next_addr = addr + bytes.length
            target = addr11Target(b0, lo, next_addr)
            mnemonic = 'AJMP'; operands = hex4(target)
        } else if ((b0 & 0x1F) === 0x11) {
            // ACALL addr11
            let [lo] = need(1)
            let next_addr = addr + bytes.length
            target = addr11Target(b0, lo, next_addr)
            mnemonic = 'ACALL'; operands = hex4(target)
        } else if (b0 < 0x80) {
            if (b0 < 0x40) {
                decode_00_3F(b0)
            } else {
                decode_40_7F(b0)
            }
        } else {
            if (b0 < 0xC0) {
                decode_80_BF(b0)
            } else {
                decode_C0_FF(b0)
            }
        }

        function decode_00_3F(b0) {
            if (b0 < 0x20) {
                if (b0 < 0x10) decode_00_0F(b0)
                else decode_10_1F(b0)
            } else {
                if (b0 < 0x30) decode_20_2F(b0)
                else decode_30_3F(b0)
            }
        }

        function decode_00_0F(b0) {
            if (b0 === 0x00) {
                mnemonic = 'NOP'
            } else if (b0 === 0x02) {
                let [hi, lo] = need(2)
                target = (hi << 8) + lo
                mnemonic = 'LJMP'; operands = hex4(target)
            } else if (b0 === 0x03) {
                mnemonic = 'RR'; operands = 'A'
            } else if (b0 === 0x04) {
                mnemonic = 'INC'; operands = 'A'
            } else if (b0 === 0x05) {
                let [d] = need(1)
                mnemonic = 'INC'; operands = directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x06) {
                mnemonic = 'INC'; operands = RiName(b0)
            } else if ((b0 & 0xF8) === 0x08) {
                mnemonic = 'INC'; operands = RnName(b0)
            }
        }

        function decode_10_1F(b0) {
            if (b0 === 0x10) {
                let [bitaddr] = need(1)
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'JBC'; operands = bitName(bitaddr, sfr_map) + ',' + hex4(target)
            } else if (b0 === 0x12) {
                let [hi, lo] = need(2)
                target = (hi << 8) + lo
                mnemonic = 'LCALL'; operands = hex4(target)
            } else if (b0 === 0x13) {
                mnemonic = 'RRC'; operands = 'A'
            } else if (b0 === 0x14) {
                mnemonic = 'DEC'; operands = 'A'
            } else if (b0 === 0x15) {
                let [d] = need(1)
                mnemonic = 'DEC'; operands = directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x16) {
                mnemonic = 'DEC'; operands = RiName(b0)
            } else if ((b0 & 0xF8) === 0x18) {
                mnemonic = 'DEC'; operands = RnName(b0)
            }
        }

        function decode_20_2F(b0) {
            if (b0 === 0x20) {
                let [bitaddr] = need(1)
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'JB'; operands = bitName(bitaddr, sfr_map) + ',' + hex4(target)
            } else if (b0 === 0x22) {
                mnemonic = 'RET'
            } else if (b0 === 0x23) {
                mnemonic = 'RL'; operands = 'A'
            } else if (b0 === 0x24) {
                let [imm] = need(1)
                mnemonic = 'ADD'; operands = 'A,#' + hex2(imm)
            } else if (b0 === 0x25) {
                let [d] = need(1)
                mnemonic = 'ADD'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x26) {
                mnemonic = 'ADD'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0x28) {
                mnemonic = 'ADD'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_30_3F(b0) {
            if (b0 === 0x30) {
                let [bitaddr] = need(1)
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'JNB'; operands = bitName(bitaddr, sfr_map) + ',' + hex4(target)
            } else if (b0 === 0x32) {
                mnemonic = 'RETI'
            } else if (b0 === 0x33) {
                mnemonic = 'RLC'; operands = 'A'
            } else if (b0 === 0x34) {
                let [imm] = need(1)
                mnemonic = 'ADDC'; operands = 'A,#' + hex2(imm)
            } else if (b0 === 0x35) {
                let [d] = need(1)
                mnemonic = 'ADDC'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x36) {
                mnemonic = 'ADDC'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0x38) {
                mnemonic = 'ADDC'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_40_7F(b0) {
            if (b0 < 0x60) {
                if (b0 < 0x50) decode_40_4F(b0)
                else decode_50_5F(b0)
            } else {
                if (b0 < 0x70) decode_60_6F(b0)
                else decode_70_7F(b0)
            }
        }

        function decode_40_4F(b0) {
            if (b0 === 0x40) {
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'JC'; operands = hex4(target)
            } else if (b0 === 0x42) {
                let [d] = need(1)
                mnemonic = 'ORL'; operands = directName(d, sfr_map) + ',A'
            } else if (b0 === 0x43) {
                let [d] = need(1); let [imm] = need(1)
                mnemonic = 'ORL'; operands = directName(d, sfr_map) + ',#' + hex2(imm)
            } else if (b0 === 0x44) {
                let [imm] = need(1)
                mnemonic = 'ORL'; operands = 'A,#' + hex2(imm)
            } else if (b0 === 0x45) {
                let [d] = need(1)
                mnemonic = 'ORL'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x46) {
                mnemonic = 'ORL'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0x48) {
                mnemonic = 'ORL'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_50_5F(b0) {
            if (b0 === 0x50) {
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'JNC'; operands = hex4(target)
            } else if (b0 === 0x52) {
                let [d] = need(1)
                mnemonic = 'ANL'; operands = directName(d, sfr_map) + ',A'
            } else if (b0 === 0x53) {
                let [d] = need(1); let [imm] = need(1)
                mnemonic = 'ANL'; operands = directName(d, sfr_map) + ',#' + hex2(imm)
            } else if (b0 === 0x54) {
                let [imm] = need(1)
                mnemonic = 'ANL'; operands = 'A,#' + hex2(imm)
            } else if (b0 === 0x55) {
                let [d] = need(1)
                mnemonic = 'ANL'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x56) {
                mnemonic = 'ANL'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0x58) {
                mnemonic = 'ANL'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_60_6F(b0) {
            if (b0 === 0x60) {
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'JZ'; operands = hex4(target)
            } else if (b0 === 0x62) {
                let [d] = need(1)
                mnemonic = 'XRL'; operands = directName(d, sfr_map) + ',A'
            } else if (b0 === 0x63) {
                let [d] = need(1); let [imm] = need(1)
                mnemonic = 'XRL'; operands = directName(d, sfr_map) + ',#' + hex2(imm)
            } else if (b0 === 0x64) {
                let [imm] = need(1)
                mnemonic = 'XRL'; operands = 'A,#' + hex2(imm)
            } else if (b0 === 0x65) {
                let [d] = need(1)
                mnemonic = 'XRL'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x66) {
                mnemonic = 'XRL'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0x68) {
                mnemonic = 'XRL'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_70_7F(b0) {
            if (b0 === 0x70) {
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'JNZ'; operands = hex4(target)
            } else if (b0 === 0x72) {
                let [bitaddr] = need(1)
                mnemonic = 'ORL'; operands = 'C,' + bitName(bitaddr, sfr_map)
            } else if (b0 === 0x73) {
                mnemonic = 'JMP'; operands = '@A+DPTR'
                // dynamiskt mål - kan inte räknas ut statiskt, target lämnas null
            } else if (b0 === 0x74) {
                let [imm] = need(1)
                mnemonic = 'MOV'; operands = 'A,#' + hex2(imm)
            } else if (b0 === 0x75) {
                let [d] = need(1); let [imm] = need(1)
                mnemonic = 'MOV'; operands = directName(d, sfr_map) + ',#' + hex2(imm)
            } else if ((b0 & 0xFE) === 0x76) {
                let [imm] = need(1)
                mnemonic = 'MOV'; operands = RiName(b0) + ',#' + hex2(imm)
            } else if ((b0 & 0xF8) === 0x78) {
                let [imm] = need(1)
                mnemonic = 'MOV'; operands = RnName(b0) + ',#' + hex2(imm)
            }
        }

        function decode_80_BF(b0) {
            if (b0 < 0xA0) {
                if (b0 < 0x90) decode_80_8F(b0)
                else decode_90_9F(b0)
            } else {
                if (b0 < 0xB0) decode_A0_AF(b0)
                else decode_B0_BF(b0)
            }
        }

        function decode_80_8F(b0) {
            if (b0 === 0x80) {
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'SJMP'; operands = hex4(target)
            } else if (b0 === 0x82) {
                let [bitaddr] = need(1)
                mnemonic = 'ANL'; operands = 'C,' + bitName(bitaddr, sfr_map)
            } else if (b0 === 0x83) {
                mnemonic = 'MOVC'; operands = 'A,@A+PC'
            } else if (b0 === 0x84) {
                mnemonic = 'DIV'; operands = 'AB'
            } else if (b0 === 0x85) {
                let [src] = need(1); let [dest] = need(1)
                mnemonic = 'MOV'; operands = directName(dest, sfr_map) + ',' + directName(src, sfr_map)
            } else if ((b0 & 0xFE) === 0x86) {
                let [d] = need(1)
                mnemonic = 'MOV'; operands = directName(d, sfr_map) + ',' + RiName(b0)
            } else if ((b0 & 0xF8) === 0x88) {
                let [d] = need(1)
                mnemonic = 'MOV'; operands = directName(d, sfr_map) + ',' + RnName(b0)
            }
        }

        function decode_90_9F(b0) {
            if (b0 === 0x90) {
                let [hi, lo] = need(2)
                mnemonic = 'MOV'; operands = 'DPTR,#' + hex4((hi << 8) + lo)
            } else if (b0 === 0x92) {
                let [bitaddr] = need(1)
                mnemonic = 'MOV'; operands = bitName(bitaddr, sfr_map) + ',C'
            } else if (b0 === 0x93) {
                mnemonic = 'MOVC'; operands = 'A,@A+DPTR'
            } else if (b0 === 0x94) {
                let [imm] = need(1)
                mnemonic = 'SUBB'; operands = 'A,#' + hex2(imm)
            } else if (b0 === 0x95) {
                let [d] = need(1)
                mnemonic = 'SUBB'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0x96) {
                mnemonic = 'SUBB'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0x98) {
                mnemonic = 'SUBB'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_A0_AF(b0) {
            if (b0 === 0xA0) {
                let [bitaddr] = need(1)
                mnemonic = 'ORL'; operands = 'C,/' + bitName(bitaddr, sfr_map)
            } else if (b0 === 0xA2) {
                let [bitaddr] = need(1)
                mnemonic = 'MOV'; operands = 'C,' + bitName(bitaddr, sfr_map)
            } else if (b0 === 0xA3) {
                mnemonic = 'INC'; operands = 'DPTR'
            } else if (b0 === 0xA4) {
                mnemonic = 'MUL'; operands = 'AB'
            } else if (b0 === 0xA5) {
                mnemonic = 'RESERVED' // "USER DEFINED" i core - 0xA5 finns ej i standard 8051
            } else if ((b0 & 0xFE) === 0xA6) {
                let [d] = need(1)
                mnemonic = 'MOV'; operands = RiName(b0) + ',' + directName(d, sfr_map)
            } else if ((b0 & 0xF8) === 0xA8) {
                let [d] = need(1)
                mnemonic = 'MOV'; operands = RnName(b0) + ',' + directName(d, sfr_map)
            }
        }

        function decode_B0_BF(b0) {
            if (b0 === 0xB0) {
                let [bitaddr] = need(1)
                mnemonic = 'ANL'; operands = 'C,/' + bitName(bitaddr, sfr_map)
            } else if (b0 === 0xB2) {
                let [bitaddr] = need(1)
                mnemonic = 'CPL'; operands = bitName(bitaddr, sfr_map)
            } else if (b0 === 0xB3) {
                mnemonic = 'CPL'; operands = 'C'
            } else if (b0 === 0xB4) {
                let [imm] = need(1); let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'CJNE'; operands = 'A,#' + hex2(imm) + ',' + hex4(target)
            } else if (b0 === 0xB5) {
                let [d] = need(1); let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'CJNE'; operands = 'A,' + directName(d, sfr_map) + ',' + hex4(target)
            } else if ((b0 & 0xFE) === 0xB6) {
                let [imm] = need(1); let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'CJNE'; operands = RiName(b0) + ',#' + hex2(imm) + ',' + hex4(target)
            } else if ((b0 & 0xF8) === 0xB8) {
                let [imm] = need(1); let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'CJNE'; operands = RnName(b0) + ',#' + hex2(imm) + ',' + hex4(target)
            }
        }

        function decode_C0_FF(b0) {
            if (b0 < 0xE0) {
                if (b0 < 0xD0) decode_C0_CF(b0)
                else decode_D0_DF(b0)
            } else {
                if (b0 < 0xF0) decode_E0_EF(b0)
                else decode_F0_FF(b0)
            }
        }

        function decode_C0_CF(b0) {
            if (b0 === 0xC0) {
                let [d] = need(1)
                mnemonic = 'PUSH'; operands = directName(d, sfr_map)
            } else if (b0 === 0xC2) {
                let [bitaddr] = need(1)
                mnemonic = 'CLR'; operands = bitName(bitaddr, sfr_map)
            } else if (b0 === 0xC3) {
                mnemonic = 'CLR'; operands = 'C'
            } else if (b0 === 0xC4) {
                mnemonic = 'SWAP'; operands = 'A'
            } else if (b0 === 0xC5) {
                let [d] = need(1)
                mnemonic = 'XCH'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0xC6) {
                mnemonic = 'XCH'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0xC8) {
                mnemonic = 'XCH'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_D0_DF(b0) {
            if (b0 === 0xD0) {
                let [d] = need(1)
                mnemonic = 'POP'; operands = directName(d, sfr_map)
            } else if (b0 === 0xD2) {
                let [bitaddr] = need(1)
                mnemonic = 'SETB'; operands = bitName(bitaddr, sfr_map)
            } else if (b0 === 0xD3) {
                mnemonic = 'SETB'; operands = 'C'
            } else if (b0 === 0xD4) {
                mnemonic = 'DA'; operands = 'A'
            } else if (b0 === 0xD5) {
                let [d] = need(1); let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'DJNZ'; operands = directName(d, sfr_map) + ',' + hex4(target)
            } else if ((b0 & 0xFE) === 0xD6) {
                mnemonic = 'XCHD'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0xD8) {
                let [off] = need(1)
                let next_addr = addr + bytes.length
                target = relTarget(next_addr, off)
                mnemonic = 'DJNZ'; operands = RnName(b0) + ',' + hex4(target)
            }
        }

        function decode_E0_EF(b0) {
            if (b0 === 0xE0) {
                mnemonic = 'MOVX'; operands = 'A,@DPTR'
            } else if ((b0 & 0xFE) === 0xE2) {
                mnemonic = 'MOVX'; operands = 'A,' + RiName(b0)
            } else if (b0 === 0xE4) {
                mnemonic = 'CLR'; operands = 'A'
            } else if (b0 === 0xE5) {
                let [d] = need(1)
                mnemonic = 'MOV'; operands = 'A,' + directName(d, sfr_map)
            } else if ((b0 & 0xFE) === 0xE6) {
                mnemonic = 'MOV'; operands = 'A,' + RiName(b0)
            } else if ((b0 & 0xF8) === 0xE8) {
                mnemonic = 'MOV'; operands = 'A,' + RnName(b0)
            }
        }

        function decode_F0_FF(b0) {
            if (b0 === 0xF0) {
                mnemonic = 'MOVX'; operands = '@DPTR,A'
            } else if ((b0 & 0xFE) === 0xF2) {
                mnemonic = 'MOVX'; operands = RiName(b0) + ',A'
            } else if (b0 === 0xF4) {
                mnemonic = 'CPL'; operands = 'A'
            } else if (b0 === 0xF5) {
                let [d] = need(1)
                mnemonic = 'MOV'; operands = directName(d, sfr_map) + ',A'
            } else if ((b0 & 0xFE) === 0xF6) {
                mnemonic = 'MOV'; operands = RiName(b0) + ',A'
            } else if ((b0 & 0xF8) === 0xF8) {
                mnemonic = 'MOV'; operands = RnName(b0) + ',A'
            }
        }

        if (mnemonic === null) {
            // opkod matchade ingen gren (får bara hända för de riktiga
            // "hål" i 8051-opkodrymden, t.ex. 0xA5 hanteras ovan explicit)
            mnemonic = 'DB'; operands = hex2(b0)
        }

        let text = operands ? (mnemonic + ' ' + operands) : mnemonic

        return {
            addr,
            length: bytes.length,
            bytes,
            mnemonic,
            operands,
            text,
            next_addr: addr + bytes.length,
            target
        }
    }

    // ---------- disassemble_range ----------
    //
    // Enkel linjär disassembly från start till end (exklusive). Bra för
    // "scrolla igenom minnet"-vyer, men känslig för alignment-drift om
    // start inte råkar vara en riktig instruktionsgräns (samma problem
    // som all linjär 8051-disassembly har).
    function disassemble_range(rom, start, end, sfr_map) {
        let out = []
        let addr = start
        while (addr < end) {
            let insn = disassemble_one(rom, addr, sfr_map)
            out.push(insn)
            addr = insn.next_addr
        }
        return out
    }

    // ---------- disassemble_recursive ----------
    //
    // Löser alignment-problemet genom att bara lita på adresser vi VET är
    // instruktionsgränser: entry_points (t.ex. reset-vektorn 0x0000,
    // interrupt-vektorer) plus varje bekräftat hopp/anrop-mål vi hittar
    // under vägen. Går inte i "gissa nästa byte"-stil rakt igenom ROM.
    //
    // entry_points: array av startadresser, t.ex. [0, 0x0B, 0x13, ...]
    // (reset + interrupt-vektorerna för 80C552)
    //
    // Returnerar en Map<addr, insn> över alla bekräftade instruktioner,
    // sorterbar efter addr för visning. Kör man den på hela ROM:en med
    // bara reset-vektorn som entry point får man ungefär vad en linker
    // skulle kalla "reachable code" - vilket är precis den delen där
    // alignment annars är tvetydig.
    function disassemble_recursive(rom, entry_points, sfr_map) {
        let visited = new Map() // addr -> insn
        let queue = entry_points.slice()

        while (queue.length) {
            let addr = queue.pop()
            if (visited.has(addr)) continue
            if (addr < 0 || addr >= rom.length) continue

            let insn = disassemble_one(rom, addr, sfr_map)
            visited.set(addr, insn)

            let m = insn.mnemonic
            let isUnconditionalStop = (m === 'RET' || m === 'RETI' || m === 'AJMP' ||
                                        m === 'LJMP' || m === 'SJMP')
            // JMP @A+DPTR (0x73) är dynamiskt - vi kan inte följa target,
            // men det stoppar inte fall-through-antagandet, för det finns
            // inget fall-through: det ÄR ett ovillkorligt hopp.
            let isDynamicJump = (m === 'JMP' && insn.operands === '@A+DPTR')

            if (insn.target !== null) {
                queue.push(insn.target)
            }
            if (!isUnconditionalStop && !isDynamicJump) {
                queue.push(insn.next_addr)
            }
        }

        return visited
    }

    // ---------- export ----------

    let api = {
        disassemble_one,
        disassemble_range,
        disassemble_recursive,
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api
    } else {
        global.js51_disasm = api
    }

})(typeof window !== 'undefined' ? window : globalThis)
