// Complete 8051 instruction set (255 defined opcodes + 1 undefined)
// Sources: https://aeb.win.tue.nl/comp/8051/set8051.html
// and https://aeb.win.tue.nl/comp/8051/instruction-set.pdf
// bytes = instruction length in bytes, cycles = machine cycles (1 cycle = 12 oscillator periods)
let help_8051_instructions = [
    {inst:"NOP", params:"", opcode:0x00, bytes: 1, cycles: 1, flags: "none", encoding:"00000000", descr:"No operation"},
    
    {inst:"AJMP", params:"code addr", opcode:0x01, bytes: 2, cycles: 2, flags: "none", encoding:"00000001", descr:"Absolute jump within page 0 of the current 2K block"},
    
    {inst:"LJMP", params:"code addr", opcode:0x02, bytes: 3, cycles: 2, flags: "none", encoding:"00000010", descr:"Jump unconditionally to a 16-bit code address"},
    
    {inst:"RR", params:"A", opcode:0x03, bytes: 1, cycles: 1, flags: "none", encoding:"00000011", descr:"Rotate the accumulator one bit right (bit7 into bit0)"},
    
    {inst:"INC", params:"A", opcode:0x04, bytes: 1, cycles: 1, flags: "none", encoding:"00000100", descr:"Increment the accumulator by 1"},
    {inst:"INC", params:"iram addr", opcode:0x05, bytes: 2, cycles: 1, flags: "none", encoding:"00000101", descr:"Increment the value at an internal RAM address by 1"},
    {inst:"INC", params:"@R0", opcode:0x06, bytes: 1, cycles: 1, flags: "none", encoding:"00000110", descr:"Increment the byte pointed to by R0"},
    {inst:"INC", params:"@R1", opcode:0x07, bytes: 1, cycles: 1, flags: "none", encoding:"00000111", descr:"Increment the byte pointed to by R1"},
    {inst:"INC", params:"R0", opcode:0x08, bytes: 1, cycles: 1, flags: "none", encoding:"00001000", descr:"Increment register R0 by 1"},
    {inst:"INC", params:"R1", opcode:0x09, bytes: 1, cycles: 1, flags: "none", encoding:"00001001", descr:"Increment register R1 by 1"},
    {inst:"INC", params:"R2", opcode:0x0A, bytes: 1, cycles: 1, flags: "none", encoding:"00001010", descr:"Increment register R2 by 1"},
    {inst:"INC", params:"R3", opcode:0x0B, bytes: 1, cycles: 1, flags: "none", encoding:"00001011", descr:"Increment register R3 by 1"},
    {inst:"INC", params:"R4", opcode:0x0C, bytes: 1, cycles: 1, flags: "none", encoding:"00001100", descr:"Increment register R4 by 1"},
    {inst:"INC", params:"R5", opcode:0x0D, bytes: 1, cycles: 1, flags: "none", encoding:"00001101", descr:"Increment register R5 by 1"},
    {inst:"INC", params:"R6", opcode:0x0E, bytes: 1, cycles: 1, flags: "none", encoding:"00001110", descr:"Increment register R6 by 1"},
    {inst:"INC", params:"R7", opcode:0x0F, bytes: 1, cycles: 1, flags: "none", encoding:"00001111", descr:"Increment register R7 by 1"},
    
    {inst:"JBC", params:"bit addr,reladdr", opcode:0x10, bytes: 3, cycles: 2, flags: "none", encoding:"00010000", descr:"Jump to reladdr and clear the bit if the bit is set, otherwise continue"},
    
    {inst:"ACALL", params:"code addr", opcode:0x11, bytes: 2, cycles: 2, flags: "none", encoding:"00010001", descr:"Absolute call within page 0 of the current 2K block"},
    
    {inst:"LCALL", params:"code addr", opcode:0x12, bytes: 3, cycles: 2, flags: "none", encoding:"00010010", descr:"Call a subroutine at a 16-bit code address"},
    
    {inst:"RRC", params:"A", opcode:0x13, bytes: 1, cycles: 1, flags: "C", encoding:"00010011", descr:"Rotate the accumulator right through the carry flag"},
    
    {inst:"DEC", params:"A", opcode:0x14, bytes: 1, cycles: 1, flags: "none", encoding:"00010100", descr:"Decrement the accumulator by 1"},
    {inst:"DEC", params:"iram addr", opcode:0x15, bytes: 2, cycles: 1, flags: "none", encoding:"00010101", descr:"Decrement the value at an internal RAM address by 1"},
    {inst:"DEC", params:"@R0", opcode:0x16, bytes: 1, cycles: 1, flags: "none", encoding:"00010110", descr:"Decrement the byte pointed to by R0"},
    {inst:"DEC", params:"@R1", opcode:0x17, bytes: 1, cycles: 1, flags: "none", encoding:"00010111", descr:"Decrement the byte pointed to by R1"},
    {inst:"DEC", params:"R0", opcode:0x18, bytes: 1, cycles: 1, flags: "none", encoding:"00011000", descr:"Decrement register R0 by 1"},
    {inst:"DEC", params:"R1", opcode:0x19, bytes: 1, cycles: 1, flags: "none", encoding:"00011001", descr:"Decrement register R1 by 1"},
    {inst:"DEC", params:"R2", opcode:0x1A, bytes: 1, cycles: 1, flags: "none", encoding:"00011010", descr:"Decrement register R2 by 1"},
    {inst:"DEC", params:"R3", opcode:0x1B, bytes: 1, cycles: 1, flags: "none", encoding:"00011011", descr:"Decrement register R3 by 1"},
    {inst:"DEC", params:"R4", opcode:0x1C, bytes: 1, cycles: 1, flags: "none", encoding:"00011100", descr:"Decrement register R4 by 1"},
    {inst:"DEC", params:"R5", opcode:0x1D, bytes: 1, cycles: 1, flags: "none", encoding:"00011101", descr:"Decrement register R5 by 1"},
    {inst:"DEC", params:"R6", opcode:0x1E, bytes: 1, cycles: 1, flags: "none", encoding:"00011110", descr:"Decrement register R6 by 1"},
    {inst:"DEC", params:"R7", opcode:0x1F, bytes: 1, cycles: 1, flags: "none", encoding:"00011111", descr:"Decrement register R7 by 1"},
    
    {inst:"JB", params:"bit addr,reladdr", opcode:0x20, bytes: 3, cycles: 2, flags: "none", encoding:"00100000", descr:"Jump to reladdr if the addressed bit is set"},
    
    {inst:"AJMP", params:"code addr", opcode:0x21, bytes: 2, cycles: 2, flags: "none", encoding:"00100001", descr:"Absolute jump within page 1 of the current 2K block"},
    
    {inst:"RET", params:"", opcode:0x22, bytes: 1, cycles: 2, flags: "none", encoding:"00100010", descr:"Return from a subroutine called by LCALL or ACALL"},
    
    {inst:"RL", params:"A", opcode:0x23, bytes: 1, cycles: 1, flags: "none", encoding:"00100011", descr:"Rotate the accumulator one bit left (bit7 into bit0)"},
    
    {inst:"ADD", params:"A,#data", opcode:0x24, bytes: 2, cycles: 1, flags: "C,AC,OV", encoding:"00100100", descr:"Add an immediate value to the accumulator"},
    {inst:"ADD", params:"A,iram addr", opcode:0x25, bytes: 2, cycles: 1, flags: "C,AC,OV", encoding:"00100101", descr:"Add an internal RAM value to the accumulator"},
    {inst:"ADD", params:"A,@R0", opcode:0x26, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00100110", descr:"Add the byte pointed to by R0 to the accumulator"},
    {inst:"ADD", params:"A,@R1", opcode:0x27, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00100111", descr:"Add the byte pointed to by R1 to the accumulator"},
    {inst:"ADD", params:"A,R0", opcode:0x28, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101000", descr:"Add register R0 to the accumulator"},
    {inst:"ADD", params:"A,R1", opcode:0x29, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101001", descr:"Add register R1 to the accumulator"},
    {inst:"ADD", params:"A,R2", opcode:0x2A, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101010", descr:"Add register R2 to the accumulator"},
    {inst:"ADD", params:"A,R3", opcode:0x2B, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101011", descr:"Add register R3 to the accumulator"},
    {inst:"ADD", params:"A,R4", opcode:0x2C, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101100", descr:"Add register R4 to the accumulator"},
    {inst:"ADD", params:"A,R5", opcode:0x2D, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101101", descr:"Add register R5 to the accumulator"},
    {inst:"ADD", params:"A,R6", opcode:0x2E, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101110", descr:"Add register R6 to the accumulator"},
    {inst:"ADD", params:"A,R7", opcode:0x2F, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00101111", descr:"Add register R7 to the accumulator"},
    
    {inst:"JNB", params:"bit addr,reladdr", opcode:0x30, bytes: 3, cycles: 2, flags: "none", encoding:"00110000", descr:"Jump to reladdr if the addressed bit is clear"},
    
    {inst:"ACALL", params:"code addr", opcode:0x31, bytes: 2, cycles: 2, flags: "none", encoding:"00110001", descr:"Absolute call within page 1 of the current 2K block"},
    
    {inst:"RETI", params:"", opcode:0x32, bytes: 1, cycles: 2, flags: "none", encoding:"00110010", descr:"Return from an interrupt service routine"},
    
    {inst:"RLC", params:"A", opcode:0x33, bytes: 1, cycles: 1, flags: "C", encoding:"00110011", descr:"Rotate the accumulator left through the carry flag"},
    
    {inst:"ADDC", params:"A,#data", opcode:0x34, bytes: 2, cycles: 1, flags: "C,AC,OV", encoding:"00110100", descr:"Add an immediate value and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,iram addr", opcode:0x35, bytes: 2, cycles: 1, flags: "C,AC,OV", encoding:"00110101", descr:"Add an internal RAM value and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,@R0", opcode:0x36, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00110110", descr:"Add the byte pointed to by R0 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,@R1", opcode:0x37, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00110111", descr:"Add the byte pointed to by R1 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R0", opcode:0x38, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111000", descr:"Add register R0 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R1", opcode:0x39, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111001", descr:"Add register R1 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R2", opcode:0x3A, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111010", descr:"Add register R2 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R3", opcode:0x3B, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111011", descr:"Add register R3 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R4", opcode:0x3C, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111100", descr:"Add register R4 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R5", opcode:0x3D, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111101", descr:"Add register R5 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R6", opcode:0x3E, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111110", descr:"Add register R6 and the carry flag to the accumulator"},
    {inst:"ADDC", params:"A,R7", opcode:0x3F, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"00111111", descr:"Add register R7 and the carry flag to the accumulator"},
    
    {inst:"JC", params:"reladdr", opcode:0x40, bytes: 2, cycles: 2, flags: "none", encoding:"01000000", descr:"Jump to reladdr if the carry flag is set"},
    
    {inst:"AJMP", params:"code addr", opcode:0x41, bytes: 2, cycles: 2, flags: "none", encoding:"01000001", descr:"Absolute jump within page 2 of the current 2K block"},
    
    {inst:"ORL", params:"iram addr,A", opcode:0x42, bytes: 2, cycles: 1, flags: "none", encoding:"01000010", descr:"Bitwise OR the accumulator into an internal RAM location"},
    {inst:"ORL", params:"iram addr,#data", opcode:0x43, bytes: 3, cycles: 2, flags: "none", encoding:"01000011", descr:"Bitwise OR an immediate value into an internal RAM location"},
    {inst:"ORL", params:"A,#data", opcode:0x44, bytes: 2, cycles: 1, flags: "none", encoding:"01000100", descr:"Bitwise OR an immediate value into the accumulator"},
    {inst:"ORL", params:"A,iram addr", opcode:0x45, bytes: 2, cycles: 1, flags: "none", encoding:"01000101", descr:"Bitwise OR an internal RAM value into the accumulator"},
    {inst:"ORL", params:"A,@R0", opcode:0x46, bytes: 1, cycles: 1, flags: "none", encoding:"01000110", descr:"Bitwise OR the byte pointed to by R0 into the accumulator"},
    {inst:"ORL", params:"A,@R1", opcode:0x47, bytes: 1, cycles: 1, flags: "none", encoding:"01000111", descr:"Bitwise OR the byte pointed to by R1 into the accumulator"},
    {inst:"ORL", params:"A,R0", opcode:0x48, bytes: 1, cycles: 1, flags: "none", encoding:"01001000", descr:"Bitwise OR register R0 into the accumulator"},
    {inst:"ORL", params:"A,R1", opcode:0x49, bytes: 1, cycles: 1, flags: "none", encoding:"01001001", descr:"Bitwise OR register R1 into the accumulator"},
    {inst:"ORL", params:"A,R2", opcode:0x4A, bytes: 1, cycles: 1, flags: "none", encoding:"01001010", descr:"Bitwise OR register R2 into the accumulator"},
    {inst:"ORL", params:"A,R3", opcode:0x4B, bytes: 1, cycles: 1, flags: "none", encoding:"01001011", descr:"Bitwise OR register R3 into the accumulator"},
    {inst:"ORL", params:"A,R4", opcode:0x4C, bytes: 1, cycles: 1, flags: "none", encoding:"01001100", descr:"Bitwise OR register R4 into the accumulator"},
    {inst:"ORL", params:"A,R5", opcode:0x4D, bytes: 1, cycles: 1, flags: "none", encoding:"01001101", descr:"Bitwise OR register R5 into the accumulator"},
    {inst:"ORL", params:"A,R6", opcode:0x4E, bytes: 1, cycles: 1, flags: "none", encoding:"01001110", descr:"Bitwise OR register R6 into the accumulator"},
    {inst:"ORL", params:"A,R7", opcode:0x4F, bytes: 1, cycles: 1, flags: "none", encoding:"01001111", descr:"Bitwise OR register R7 into the accumulator"},
    
    {inst:"JNC", params:"reladdr", opcode:0x50, bytes: 2, cycles: 2, flags: "none", encoding:"01010000", descr:"Jump to reladdr if the carry flag is clear"},
    
    {inst:"ACALL", params:"code addr", opcode:0x51, bytes: 2, cycles: 2, flags: "none", encoding:"01010001", descr:"Absolute call within page 2 of the current 2K block"},
    
    {inst:"ANL", params:"iram addr,A", opcode:0x52, bytes: 2, cycles: 1, flags: "none", encoding:"01010010", descr:"Bitwise AND the accumulator into an internal RAM location"},
    {inst:"ANL", params:"iram addr,#data", opcode:0x53, bytes: 3, cycles: 2, flags: "none", encoding:"01010011", descr:"Bitwise AND an immediate value into an internal RAM location"},
    {inst:"ANL", params:"A,#data", opcode:0x54, bytes: 2, cycles: 1, flags: "none", encoding:"01010100", descr:"Bitwise AND an immediate value into the accumulator"},
    {inst:"ANL", params:"A,iram addr", opcode:0x55, bytes: 2, cycles: 1, flags: "none", encoding:"01010101", descr:"Bitwise AND an internal RAM value into the accumulator"},
    {inst:"ANL", params:"A,@R0", opcode:0x56, bytes: 1, cycles: 1, flags: "none", encoding:"01010110", descr:"Bitwise AND the byte pointed to by R0 into the accumulator"},
    {inst:"ANL", params:"A,@R1", opcode:0x57, bytes: 1, cycles: 1, flags: "none", encoding:"01010111", descr:"Bitwise AND the byte pointed to by R1 into the accumulator"},
    {inst:"ANL", params:"A,R0", opcode:0x58, bytes: 1, cycles: 1, flags: "none", encoding:"01011000", descr:"Bitwise AND register R0 into the accumulator"},
    {inst:"ANL", params:"A,R1", opcode:0x59, bytes: 1, cycles: 1, flags: "none", encoding:"01011001", descr:"Bitwise AND register R1 into the accumulator"},
    {inst:"ANL", params:"A,R2", opcode:0x5A, bytes: 1, cycles: 1, flags: "none", encoding:"01011010", descr:"Bitwise AND register R2 into the accumulator"},
    {inst:"ANL", params:"A,R3", opcode:0x5B, bytes: 1, cycles: 1, flags: "none", encoding:"01011011", descr:"Bitwise AND register R3 into the accumulator"},
    {inst:"ANL", params:"A,R4", opcode:0x5C, bytes: 1, cycles: 1, flags: "none", encoding:"01011100", descr:"Bitwise AND register R4 into the accumulator"},
    {inst:"ANL", params:"A,R5", opcode:0x5D, bytes: 1, cycles: 1, flags: "none", encoding:"01011101", descr:"Bitwise AND register R5 into the accumulator"},
    {inst:"ANL", params:"A,R6", opcode:0x5E, bytes: 1, cycles: 1, flags: "none", encoding:"01011110", descr:"Bitwise AND register R6 into the accumulator"},
    {inst:"ANL", params:"A,R7", opcode:0x5F, bytes: 1, cycles: 1, flags: "none", encoding:"01011111", descr:"Bitwise AND register R7 into the accumulator"},
    
    {inst:"JZ", params:"reladdr", opcode:0x60, bytes: 2, cycles: 2, flags: "none", encoding:"01100000", descr:"Jump to reladdr if the accumulator is zero"},
    
    {inst:"AJMP", params:"code addr", opcode:0x61, bytes: 2, cycles: 2, flags: "none", encoding:"01100001", descr:"Absolute jump within page 3 of the current 2K block"},
    
    {inst:"XRL", params:"iram addr,A", opcode:0x62, bytes: 2, cycles: 1, flags: "none", encoding:"01100010", descr:"Bitwise XOR the accumulator into an internal RAM location"},
    {inst:"XRL", params:"iram addr,#data", opcode:0x63, bytes: 3, cycles: 2, flags: "none", encoding:"01100011", descr:"Bitwise XOR an immediate value into an internal RAM location"},
    {inst:"XRL", params:"A,#data", opcode:0x64, bytes: 2, cycles: 1, flags: "none", encoding:"01100100", descr:"Bitwise XOR an immediate value into the accumulator"},
    {inst:"XRL", params:"A,iram addr", opcode:0x65, bytes: 2, cycles: 1, flags: "none", encoding:"01100101", descr:"Bitwise XOR an internal RAM value into the accumulator"},
    {inst:"XRL", params:"A,@R0", opcode:0x66, bytes: 1, cycles: 1, flags: "none", encoding:"01100110", descr:"Bitwise XOR the byte pointed to by R0 into the accumulator"},
    {inst:"XRL", params:"A,@R1", opcode:0x67, bytes: 1, cycles: 1, flags: "none", encoding:"01100111", descr:"Bitwise XOR the byte pointed to by R1 into the accumulator"},
    {inst:"XRL", params:"A,R0", opcode:0x68, bytes: 1, cycles: 1, flags: "none", encoding:"01101000", descr:"Bitwise XOR register R0 into the accumulator"},
    {inst:"XRL", params:"A,R1", opcode:0x69, bytes: 1, cycles: 1, flags: "none", encoding:"01101001", descr:"Bitwise XOR register R1 into the accumulator"},
    {inst:"XRL", params:"A,R2", opcode:0x6A, bytes: 1, cycles: 1, flags: "none", encoding:"01101010", descr:"Bitwise XOR register R2 into the accumulator"},
    {inst:"XRL", params:"A,R3", opcode:0x6B, bytes: 1, cycles: 1, flags: "none", encoding:"01101011", descr:"Bitwise XOR register R3 into the accumulator"},
    {inst:"XRL", params:"A,R4", opcode:0x6C, bytes: 1, cycles: 1, flags: "none", encoding:"01101100", descr:"Bitwise XOR register R4 into the accumulator"},
    {inst:"XRL", params:"A,R5", opcode:0x6D, bytes: 1, cycles: 1, flags: "none", encoding:"01101101", descr:"Bitwise XOR register R5 into the accumulator"},
    {inst:"XRL", params:"A,R6", opcode:0x6E, bytes: 1, cycles: 1, flags: "none", encoding:"01101110", descr:"Bitwise XOR register R6 into the accumulator"},
    {inst:"XRL", params:"A,R7", opcode:0x6F, bytes: 1, cycles: 1, flags: "none", encoding:"01101111", descr:"Bitwise XOR register R7 into the accumulator"},
    
    {inst:"JNZ", params:"reladdr", opcode:0x70, bytes: 2, cycles: 2, flags: "none", encoding:"01110000", descr:"Jump to reladdr if the accumulator is not zero"},
    
    {inst:"ACALL", params:"code addr", opcode:0x71, bytes: 2, cycles: 2, flags: "none", encoding:"01110001", descr:"Absolute call within page 3 of the current 2K block"},
    
    {inst:"ORL", params:"C,bit addr", opcode:0x72, bytes: 2, cycles: 2, flags: "C", encoding:"01110010", descr:"OR the addressed bit into the carry flag"},
    
    {inst:"JMP", params:"@A+DPTR", opcode:0x73, bytes: 1, cycles: 2, flags: "none", encoding:"01110011", descr:"Jump to the address formed by A + DPTR"},
    
    {inst:"MOV", params:"A,#data", opcode:0x74, bytes: 2, cycles: 1, flags: "none", encoding:"01110100", descr:"Load the accumulator with an immediate value"},
    {inst:"MOV", params:"iram addr,#data", opcode:0x75, bytes: 3, cycles: 2, flags: "none", encoding:"01110101", descr:"Load an internal RAM location with an immediate value"},
    {inst:"MOV", params:"@R0,#data", opcode:0x76, bytes: 2, cycles: 1, flags: "none", encoding:"01110110", descr:"Load the byte pointed to by R0 with an immediate value"},
    {inst:"MOV", params:"@R1,#data", opcode:0x77, bytes: 2, cycles: 1, flags: "none", encoding:"01110111", descr:"Load the byte pointed to by R1 with an immediate value"},
    {inst:"MOV", params:"R0,#data", opcode:0x78, bytes: 2, cycles: 1, flags: "none", encoding:"01111000", descr:"Load register R0 with an immediate value"},
    {inst:"MOV", params:"R1,#data", opcode:0x79, bytes: 2, cycles: 1, flags: "none", encoding:"01111001", descr:"Load register R1 with an immediate value"},
    {inst:"MOV", params:"R2,#data", opcode:0x7A, bytes: 2, cycles: 1, flags: "none", encoding:"01111010", descr:"Load register R2 with an immediate value"},
    {inst:"MOV", params:"R3,#data", opcode:0x7B, bytes: 2, cycles: 1, flags: "none", encoding:"01111011", descr:"Load register R3 with an immediate value"},
    {inst:"MOV", params:"R4,#data", opcode:0x7C, bytes: 2, cycles: 1, flags: "none", encoding:"01111100", descr:"Load register R4 with an immediate value"},
    {inst:"MOV", params:"R5,#data", opcode:0x7D, bytes: 2, cycles: 1, flags: "none", encoding:"01111101", descr:"Load register R5 with an immediate value"},
    {inst:"MOV", params:"R6,#data", opcode:0x7E, bytes: 2, cycles: 1, flags: "none", encoding:"01111110", descr:"Load register R6 with an immediate value"},
    {inst:"MOV", params:"R7,#data", opcode:0x7F, bytes: 2, cycles: 1, flags: "none", encoding:"01111111", descr:"Load register R7 with an immediate value"},
    
    {inst:"SJMP", params:"reladdr", opcode:0x80, bytes: 2, cycles: 2, flags: "none", encoding:"10000000", descr:"Jump unconditionally to a relative address (-128 to +127)"},
    
    {inst:"AJMP", params:"code addr", opcode:0x81, bytes: 2, cycles: 2, flags: "none", encoding:"10000001", descr:"Absolute jump within page 4 of the current 2K block"},
    
    {inst:"ANL", params:"C,bit addr", opcode:0x82, bytes: 2, cycles: 2, flags: "C", encoding:"10000010", descr:"AND the addressed bit into the carry flag"},
    
    {inst:"MOVC", params:"A,@A+PC", opcode:0x83, bytes: 1, cycles: 2, flags: "none", encoding:"10000011", descr:"Load the accumulator from code memory at PC+1+A"},
    
    {inst:"DIV", params:"AB", opcode:0x84, bytes: 1, cycles: 4, flags: "C,OV", encoding:"10000100", descr:"Divide the accumulator by B, quotient in A, remainder in B"},
    
    {inst:"MOV", params:"iram addr,iram addr", opcode:0x85, bytes: 3, cycles: 2, flags: "none", encoding:"10000101", descr:"Copy one internal RAM location to another (source byte precedes destination in the encoding)"},
    {inst:"MOV", params:"iram addr,@R0", opcode:0x86, bytes: 2, cycles: 2, flags: "none", encoding:"10000110", descr:"Copy the byte pointed to by R0 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,@R1", opcode:0x87, bytes: 2, cycles: 2, flags: "none", encoding:"10000111", descr:"Copy the byte pointed to by R1 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R0", opcode:0x88, bytes: 2, cycles: 2, flags: "none", encoding:"10001000", descr:"Copy register R0 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R1", opcode:0x89, bytes: 2, cycles: 2, flags: "none", encoding:"10001001", descr:"Copy register R1 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R2", opcode:0x8A, bytes: 2, cycles: 2, flags: "none", encoding:"10001010", descr:"Copy register R2 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R3", opcode:0x8B, bytes: 2, cycles: 2, flags: "none", encoding:"10001011", descr:"Copy register R3 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R4", opcode:0x8C, bytes: 2, cycles: 2, flags: "none", encoding:"10001100", descr:"Copy register R4 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R5", opcode:0x8D, bytes: 2, cycles: 2, flags: "none", encoding:"10001101", descr:"Copy register R5 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R6", opcode:0x8E, bytes: 2, cycles: 2, flags: "none", encoding:"10001110", descr:"Copy register R6 into an internal RAM location"},
    {inst:"MOV", params:"iram addr,R7", opcode:0x8F, bytes: 2, cycles: 2, flags: "none", encoding:"10001111", descr:"Copy register R7 into an internal RAM location"},
    {inst:"MOV", params:"DPTR,#data16", opcode:0x90, bytes: 3, cycles: 2, flags: "none", encoding:"10010000", descr:"Load the 16-bit data pointer with an immediate value"},
    
    {inst:"ACALL", params:"code addr", opcode:0x91, bytes: 2, cycles: 2, flags: "none", encoding:"10010001", descr:"Absolute call within page 4 of the current 2K block"},
    
    {inst:"MOV", params:"bit addr,C", opcode:0x92, bytes: 2, cycles: 2, flags: "none", encoding:"10010010", descr:"Copy the carry flag into the addressed bit"},
    
    {inst:"MOVC", params:"A,@A+DPTR", opcode:0x93, bytes: 1, cycles: 2, flags: "none", encoding:"10010011", descr:"Load the accumulator from code memory at DPTR+A"},
    
    {inst:"SUBB", params:"A,#data", opcode:0x94, bytes: 2, cycles: 1, flags: "C,AC,OV", encoding:"10010100", descr:"Subtract an immediate value and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,iram addr", opcode:0x95, bytes: 2, cycles: 1, flags: "C,AC,OV", encoding:"10010101", descr:"Subtract an internal RAM value and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,@R0", opcode:0x96, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10010110", descr:"Subtract the byte pointed to by R0 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,@R1", opcode:0x97, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10010111", descr:"Subtract the byte pointed to by R1 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R0", opcode:0x98, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011000", descr:"Subtract register R0 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R1", opcode:0x99, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011001", descr:"Subtract register R1 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R2", opcode:0x9A, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011010", descr:"Subtract register R2 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R3", opcode:0x9B, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011011", descr:"Subtract register R3 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R4", opcode:0x9C, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011100", descr:"Subtract register R4 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R5", opcode:0x9D, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011101", descr:"Subtract register R5 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R6", opcode:0x9E, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011110", descr:"Subtract register R6 and the carry flag from the accumulator"},
    {inst:"SUBB", params:"A,R7", opcode:0x9F, bytes: 1, cycles: 1, flags: "C,AC,OV", encoding:"10011111", descr:"Subtract register R7 and the carry flag from the accumulator"},
    
    {inst:"ORL", params:"C,/bit addr", opcode:0xA0, bytes: 2, cycles: 2, flags: "C", encoding:"10100000", descr:"OR the complement of the addressed bit into the carry flag"},
    
    {inst:"AJMP", params:"code addr", opcode:0xA1, bytes: 2, cycles: 2, flags: "none", encoding:"10100001", descr:"Absolute jump within page 5 of the current 2K block"},
    
    {inst:"MOV", params:"C,bit addr", opcode:0xA2, bytes: 2, cycles: 2, flags: "C", encoding:"10100010", descr:"Copy the addressed bit into the carry flag"},
    
    {inst:"INC", params:"DPTR", opcode:0xA3, bytes: 1, cycles: 2, flags: "none", encoding:"10100011", descr:"Increment the 16-bit data pointer by 1"},
    
    {inst:"MUL", params:"AB", opcode:0xA4, bytes: 1, cycles: 4, flags: "C,OV", encoding:"10100100", descr:"Multiply the accumulator by B, low byte in A, high byte in B"},
    
    {inst:"???", params:"", opcode:0xA5, bytes: 1, cycles: 1, flags: "C", encoding:"10100101", descr:"Undefined/reserved opcode; not a documented instruction"},
    
    {inst:"MOV", params:"@R0,iram addr", opcode:0xA6, bytes: 2, cycles: 2, flags: "none", encoding:"10100110", descr:"Copy an internal RAM location into the byte pointed to by R0"},
    {inst:"MOV", params:"@R1,iram addr", opcode:0xA7, bytes: 2, cycles: 2, flags: "none", encoding:"10100111", descr:"Copy an internal RAM location into the byte pointed to by R1"},
    {inst:"MOV", params:"R0,iram addr", opcode:0xA8, bytes: 2, cycles: 2, flags: "none", encoding:"10101000", descr:"Copy an internal RAM location into register R0"},
    {inst:"MOV", params:"R1,iram addr", opcode:0xA9, bytes: 2, cycles: 2, flags: "none", encoding:"10101001", descr:"Copy an internal RAM location into register R1"},
    {inst:"MOV", params:"R2,iram addr", opcode:0xAA, bytes: 2, cycles: 2, flags: "none", encoding:"10101010", descr:"Copy an internal RAM location into register R2"},
    {inst:"MOV", params:"R3,iram addr", opcode:0xAB, bytes: 2, cycles: 2, flags: "none", encoding:"10101011", descr:"Copy an internal RAM location into register R3"},
    {inst:"MOV", params:"R4,iram addr", opcode:0xAC, bytes: 2, cycles: 2, flags: "none", encoding:"10101100", descr:"Copy an internal RAM location into register R4"},
    {inst:"MOV", params:"R5,iram addr", opcode:0xAD, bytes: 2, cycles: 2, flags: "none", encoding:"10101101", descr:"Copy an internal RAM location into register R5"},
    {inst:"MOV", params:"R6,iram addr", opcode:0xAE, bytes: 2, cycles: 2, flags: "none", encoding:"10101110", descr:"Copy an internal RAM location into register R6"},
    {inst:"MOV", params:"R7,iram addr", opcode:0xAF, bytes: 2, cycles: 2, flags: "none", encoding:"10101111", descr:"Copy an internal RAM location into register R7"},
    
    {inst:"ANL", params:"C,/bit addr", opcode:0xB0, bytes: 2, cycles: 2, flags: "C", encoding:"10110000", descr:"AND the complement of the addressed bit into the carry flag"},
    
    {inst:"ACALL", params:"code addr", opcode:0xB1, bytes: 2, cycles: 2, flags: "none", encoding:"10110001", descr:"Absolute call within page 5 of the current 2K block"},
    
    {inst:"CPL", params:"bit addr", opcode:0xB2, bytes: 2, cycles: 1, flags: "none", encoding:"10110010", descr:"Complement the addressed bit"},
    {inst:"CPL", params:"C", opcode:0xB3, bytes: 1, cycles: 1, flags: "C", encoding:"10110011", descr:"Complement the carry flag"},
    
    {inst:"CJNE", params:"A,#data,reladdr", opcode:0xB4, bytes: 3, cycles: 2, flags: "C", encoding:"10110100", descr:"Compare the accumulator to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"A,iram addr,reladdr", opcode:0xB5, bytes: 3, cycles: 2, flags: "C", encoding:"10110101", descr:"Compare the accumulator to an internal RAM value and jump if not equal"},
    {inst:"CJNE", params:"@R0,#data,reladdr", opcode:0xB6, bytes: 3, cycles: 2, flags: "C", encoding:"10110110", descr:"Compare the byte pointed to by R0 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"@R1,#data,reladdr", opcode:0xB7, bytes: 3, cycles: 2, flags: "C", encoding:"10110111", descr:"Compare the byte pointed to by R1 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R0,#data,reladdr", opcode:0xB8, bytes: 3, cycles: 2, flags: "C", encoding:"10111000", descr:"Compare register R0 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R1,#data,reladdr", opcode:0xB9, bytes: 3, cycles: 2, flags: "C", encoding:"10111001", descr:"Compare register R1 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R2,#data,reladdr", opcode:0xBA, bytes: 3, cycles: 2, flags: "C", encoding:"10111010", descr:"Compare register R2 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R3,#data,reladdr", opcode:0xBB, bytes: 3, cycles: 2, flags: "C", encoding:"10111011", descr:"Compare register R3 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R4,#data,reladdr", opcode:0xBC, bytes: 3, cycles: 2, flags: "C", encoding:"10111100", descr:"Compare register R4 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R5,#data,reladdr", opcode:0xBD, bytes: 3, cycles: 2, flags: "C", encoding:"10111101", descr:"Compare register R5 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R6,#data,reladdr", opcode:0xBE, bytes: 3, cycles: 2, flags: "C", encoding:"10111110", descr:"Compare register R6 to an immediate value and jump if not equal"},
    {inst:"CJNE", params:"R7,#data,reladdr", opcode:0xBF, bytes: 3, cycles: 2, flags: "C", encoding:"10111111", descr:"Compare register R7 to an immediate value and jump if not equal"},
    
    {inst:"PUSH", params:"iram addr", opcode:0xC0, bytes: 2, cycles: 2, flags: "none", encoding:"11000000", descr:"Increment the stack pointer and copy an internal RAM value onto the stack"},
    
    {inst:"AJMP", params:"code addr", opcode:0xC1, bytes: 2, cycles: 2, flags: "none", encoding:"11000001", descr:"Absolute jump within page 6 of the current 2K block"},
    
    {inst:"CLR", params:"bit addr", opcode:0xC2, bytes: 2, cycles: 1, flags: "none", encoding:"11000010", descr:"Clear the addressed bit to 0"},
    {inst:"CLR", params:"C", opcode:0xC3, bytes: 1, cycles: 1, flags: "C", encoding:"11000011", descr:"Clear the carry flag to 0"},
    
    {inst:"SWAP", params:"A", opcode:0xC4, bytes: 1, cycles: 1, flags: "none", encoding:"11000100", descr:"Swap the upper and lower nibbles of the accumulator"},
    
    {inst:"XCH", params:"A,iram addr", opcode:0xC5, bytes: 2, cycles: 1, flags: "none", encoding:"11000101", descr:"Exchange the accumulator with an internal RAM value"},
    {inst:"XCH", params:"A,@R0", opcode:0xC6, bytes: 1, cycles: 1, flags: "none", encoding:"11000110", descr:"Exchange the accumulator with the byte pointed to by R0"},
    {inst:"XCH", params:"A,@R1", opcode:0xC7, bytes: 1, cycles: 1, flags: "none", encoding:"11000111", descr:"Exchange the accumulator with the byte pointed to by R1"},
    {inst:"XCH", params:"A,R0", opcode:0xC8, bytes: 1, cycles: 1, flags: "none", encoding:"11001000", descr:"Exchange the accumulator with register R0"},
    {inst:"XCH", params:"A,R1", opcode:0xC9, bytes: 1, cycles: 1, flags: "none", encoding:"11001001", descr:"Exchange the accumulator with register R1"},
    {inst:"XCH", params:"A,R2", opcode:0xCA, bytes: 1, cycles: 1, flags: "none", encoding:"11001010", descr:"Exchange the accumulator with register R2"},
    {inst:"XCH", params:"A,R3", opcode:0xCB, bytes: 1, cycles: 1, flags: "none", encoding:"11001011", descr:"Exchange the accumulator with register R3"},
    {inst:"XCH", params:"A,R4", opcode:0xCC, bytes: 1, cycles: 1, flags: "none", encoding:"11001100", descr:"Exchange the accumulator with register R4"},
    {inst:"XCH", params:"A,R5", opcode:0xCD, bytes: 1, cycles: 1, flags: "none", encoding:"11001101", descr:"Exchange the accumulator with register R5"},
    {inst:"XCH", params:"A,R6", opcode:0xCE, bytes: 1, cycles: 1, flags: "none", encoding:"11001110", descr:"Exchange the accumulator with register R6"},
    {inst:"XCH", params:"A,R7", opcode:0xCF, bytes: 1, cycles: 1, flags: "none", encoding:"11001111", descr:"Exchange the accumulator with register R7"},
    
    {inst:"POP", params:"iram addr", opcode:0xD0, bytes: 2, cycles: 2, flags: "none", encoding:"11010000", descr:"Copy the value at the stack pointer into an internal RAM location and decrement the stack pointer"},
    
    {inst:"ACALL", params:"code addr", opcode:0xD1, bytes: 2, cycles: 2, flags: "none", encoding:"11010001", descr:"Absolute call within page 6 of the current 2K block"},
    
    {inst:"SETB", params:"bit addr", opcode:0xD2, bytes: 2, cycles: 1, flags: "none", encoding:"11010010", descr:"Set the addressed bit to 1"},
    {inst:"SETB", params:"C", opcode:0xD3, bytes: 1, cycles: 1, flags: "C", encoding:"11010011", descr:"Set the carry flag to 1"},
    
    {inst:"DA", params:"A", opcode:0xD4, bytes: 1, cycles: 1, flags: "C", encoding:"11010100", descr:"Decimal-adjust the accumulator after a BCD addition"},
    
    {inst:"DJNZ", params:"iram addr,reladdr", opcode:0xD5, bytes: 3, cycles: 2, flags: "none", encoding:"11010101", descr:"Decrement an internal RAM value and jump to reladdr if it is not zero"},
    
    {inst:"XCHD", params:"A,@R0", opcode:0xD6, bytes: 1, cycles: 1, flags: "none", encoding:"11010110", descr:"Exchange the low nibble of the accumulator with the low nibble pointed to by R0"},
    {inst:"XCHD", params:"A,@R1", opcode:0xD7, bytes: 1, cycles: 1, flags: "none", encoding:"11010111", descr:"Exchange the low nibble of the accumulator with the low nibble pointed to by R1"},
    
    {inst:"DJNZ", params:"R0,reladdr", opcode:0xD8, bytes: 2, cycles: 2, flags: "none", encoding:"11011000", descr:"Decrement register R0 and jump to reladdr if it is not zero"},
    {inst:"DJNZ", params:"R1,reladdr", opcode:0xD9, bytes: 2, cycles: 2, flags: "none", encoding:"11011001", descr:"Decrement register R1 and jump to reladdr if it is not zero"},
    {inst:"DJNZ", params:"R2,reladdr", opcode:0xDA, bytes: 2, cycles: 2, flags: "none", encoding:"11011010", descr:"Decrement register R2 and jump to reladdr if it is not zero"},
    {inst:"DJNZ", params:"R3,reladdr", opcode:0xDB, bytes: 2, cycles: 2, flags: "none", encoding:"11011011", descr:"Decrement register R3 and jump to reladdr if it is not zero"},
    {inst:"DJNZ", params:"R4,reladdr", opcode:0xDC, bytes: 2, cycles: 2, flags: "none", encoding:"11011100", descr:"Decrement register R4 and jump to reladdr if it is not zero"},
    {inst:"DJNZ", params:"R5,reladdr", opcode:0xDD, bytes: 2, cycles: 2, flags: "none", encoding:"11011101", descr:"Decrement register R5 and jump to reladdr if it is not zero"},
    {inst:"DJNZ", params:"R6,reladdr", opcode:0xDE, bytes: 2, cycles: 2, flags: "none", encoding:"11011110", descr:"Decrement register R6 and jump to reladdr if it is not zero"},
    {inst:"DJNZ", params:"R7,reladdr", opcode:0xDF, bytes: 2, cycles: 2, flags: "none", encoding:"11011111", descr:"Decrement register R7 and jump to reladdr if it is not zero"},
    
    {inst:"MOVX", params:"A,@DPTR", opcode:0xE0, bytes: 1, cycles: 2, flags: "none", encoding:"11100000", descr:"Move external RAM (16-bit addr.) to A"},
    
    {inst:"AJMP", params:"code addr", opcode:0xE1, bytes: 2, cycles: 2, flags: "none", encoding:"11100001", descr:"Absolute jump within page 7 of the current 2K block"},
    
    {inst:"MOVX", params:"A,@R0", opcode:0xE2, bytes: 1, cycles: 2, flags: "none", encoding:"11100010", descr:"Move external RAM (8-bit addr., via P0/P2 latch) to A"},
    {inst:"MOVX", params:"A,@R1", opcode:0xE3, bytes: 1, cycles: 2, flags: "none", encoding:"11100011", descr:"Move external RAM (8-bit addr., via P0/P2 latch) to A"},
    
    {inst:"CLR", params:"A", opcode:0xE4, bytes: 1, cycles: 1, flags: "none", encoding:"11100100", descr:"Clear the accumulator to 0"},
    
    {inst:"MOV", params:"A,iram addr", opcode:0xE5, bytes: 2, cycles: 1, flags: "none", encoding:"11100101", descr:"Load the accumulator from an internal RAM location"},
    {inst:"MOV", params:"A,@R0", opcode:0xE6, bytes: 1, cycles: 1, flags: "none", encoding:"11100110", descr:"Load the accumulator from the byte pointed to by R0"},
    {inst:"MOV", params:"A,@R1", opcode:0xE7, bytes: 1, cycles: 1, flags: "none", encoding:"11100111", descr:"Load the accumulator from the byte pointed to by R1"},
    {inst:"MOV", params:"A,R0", opcode:0xE8, bytes: 1, cycles: 1, flags: "none", encoding:"11101000", descr:"Load the accumulator from register R0"},
    {inst:"MOV", params:"A,R1", opcode:0xE9, bytes: 1, cycles: 1, flags: "none", encoding:"11101001", descr:"Load the accumulator from register R1"},
    {inst:"MOV", params:"A,R2", opcode:0xEA, bytes: 1, cycles: 1, flags: "none", encoding:"11101010", descr:"Load the accumulator from register R2"},
    {inst:"MOV", params:"A,R3", opcode:0xEB, bytes: 1, cycles: 1, flags: "none", encoding:"11101011", descr:"Load the accumulator from register R3"},
    {inst:"MOV", params:"A,R4", opcode:0xEC, bytes: 1, cycles: 1, flags: "none", encoding:"11101100", descr:"Load the accumulator from register R4"},
    {inst:"MOV", params:"A,R5", opcode:0xED, bytes: 1, cycles: 1, flags: "none", encoding:"11101101", descr:"Load the accumulator from register R5"},
    {inst:"MOV", params:"A,R6", opcode:0xEE, bytes: 1, cycles: 1, flags: "none", encoding:"11101110", descr:"Load the accumulator from register R6"},
    {inst:"MOV", params:"A,R7", opcode:0xEF, bytes: 1, cycles: 1, flags: "none", encoding:"11101111", descr:"Load the accumulator from register R7"},
    
    {inst:"MOVX", params:"@DPTR,A", opcode:0xF0, bytes: 1, cycles: 2, flags: "none", encoding:"11110000", descr:"Move A to external RAM (16-bit addr.)"},
    
    {inst:"ACALL", params:"code addr", opcode:0xF1, bytes: 2, cycles: 2, flags: "none", encoding:"11110001", descr:"Absolute call within page 7 of the current 2K block"},
    
    {inst:"MOVX", params:"@R0,A", opcode:0xF2, bytes: 1, cycles: 2, flags: "none", encoding:"11110010", descr:"Move A to external RAM (8-bit addr., via P0/P2 latch)"},
    {inst:"MOVX", params:"@R1,A", opcode:0xF3, bytes: 1, cycles: 2, flags: "none", encoding:"11110011", descr:"Move A to external RAM (8-bit addr., via P0/P2 latch)"},
    
    {inst:"CPL", params:"A", opcode:0xF4, bytes: 1, cycles: 1, flags: "none", encoding:"11110100", descr:"Complement every bit of the accumulator"},
    
    {inst:"MOV", params:"iram addr,A", opcode:0xF5, bytes: 2, cycles: 1, flags: "none", encoding:"11110101", descr:"Store the accumulator into an internal RAM location"},
    {inst:"MOV", params:"@R0,A", opcode:0xF6, bytes: 1, cycles: 1, flags: "none", encoding:"11110110", descr:"Store the accumulator into the byte pointed to by R0"},
    {inst:"MOV", params:"@R1,A", opcode:0xF7, bytes: 1, cycles: 1, flags: "none", encoding:"11110111", descr:"Store the accumulator into the byte pointed to by R1"},
    {inst:"MOV", params:"R0,A", opcode:0xF8, bytes: 1, cycles: 1, flags: "none", encoding:"11111000", descr:"Store the accumulator into register R0"},
    {inst:"MOV", params:"R1,A", opcode:0xF9, bytes: 1, cycles: 1, flags: "none", encoding:"11111001", descr:"Store the accumulator into register R1"},
    {inst:"MOV", params:"R2,A", opcode:0xFA, bytes: 1, cycles: 1, flags: "none", encoding:"11111010", descr:"Store the accumulator into register R2"},
    {inst:"MOV", params:"R3,A", opcode:0xFB, bytes: 1, cycles: 1, flags: "none", encoding:"11111011", descr:"Store the accumulator into register R3"},
    {inst:"MOV", params:"R4,A", opcode:0xFC, bytes: 1, cycles: 1, flags: "none", encoding:"11111100", descr:"Store the accumulator into register R4"},
    {inst:"MOV", params:"R5,A", opcode:0xFD, bytes: 1, cycles: 1, flags: "none", encoding:"11111101", descr:"Store the accumulator into register R5"},
    {inst:"MOV", params:"R6,A", opcode:0xFE, bytes: 1, cycles: 1, flags: "none", encoding:"11111110", descr:"Store the accumulator into register R6"},
    {inst:"MOV", params:"R7,A", opcode:0xFF, bytes: 1, cycles: 1, flags: "none", encoding:"11111111", descr:"Store the accumulator into register R7"}
];

export default help_8051_instructions;