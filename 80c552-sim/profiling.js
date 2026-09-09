
let profilingItems = [
    //{startAddr:0x50b1, endAddr:0x56b2}, // aprox 68000 cycles
    //{startAddr:0x4a3d, endAddr:0x4ebe},
  /*  {startAddr:0x677A, endAddr:0x6798}, // 73000 cycles, all down
    {startAddr:0x677A, endAddr:0x677D}, // 68000 cycles, FUN_CODE_50b1_called_from_main_loop callsite
    {startAddr:0x677D, endAddr:0x6780}, // 870 cycles, FUN_CODE_56b3_called_from_main_loop callsite
    {startAddr:0x6780, endAddr:0x6783}, // 77 cycles, FUN_CODE_390b_called_from_main_loop callsite
    {startAddr:0x6783, endAddr:0x6786}, // 397 cycles, FUN_CODE_4a3d_called_from_main_loop callsite
    {startAddr:0x6786, endAddr:0x6789}, // 2326 cycles, FUN_CODE_411d_called_from_main_loop callsite
    {startAddr:0x6789, endAddr:0x678C}, // 168 cycles, FUN_CODE_47bb_called_from_main_loop callsite
    {startAddr:0x678C, endAddr:0x678F}, // 65 cycles, heat_regulation_gt3_gt4_hysteresis callsite
    {startAddr:0x678F, endAddr:0x6792}, // 332 cycles, FUN_CODE_4ebf_called_from_main_loop callsite
    {startAddr:0x6792, endAddr:0x6795}, // 243 cycles, FUN_CODE_6096_handle_mode_maybe callsite
    {startAddr:0x6795, endAddr:0x6798}, // 101 cycles, FUN_CODE_63e0_called_from_main_loop callsite
*/
    //{startAddr:0x50b1, endAddr:0x51dd},
    //{startAddr:0x51dd, endAddr:0x51e0}, // 26320 cycles
    //{startAddr:0xebe7, endAddr:0xefaf}, // 2000 cycles

    //{startAddr:0x665F, endAddr:0x6774}, // 237800/159000 cycles aprox 
    //{startAddr:0x671d, endAddr:0x6774},
    //{startAddr:0x671d, endAddr:0x6720}, // MainLoop_UART_TASK 179063 cycles
    //{startAddr:0x8b9b, endAddr:0x8b9e}, // MainLoop_UART_TASK - refresh_front_panel 165000/82800 cycles
    //{startAddr:0x7de4, endAddr:0x7f2a},
    //{startAddr:0x7f50, endAddr:0x7f68}, // a actual i2c transfer
    //{startAddr:0x7f5b, endAddr:0x7f68},
    //{startAddr:0x6774, endAddr:0x6798}, // 70000 cycles aprox
    //{startAddr:0x674b, endAddr:0x674e},
    //{startAddr:0x6720, endAddr:0x6723},
    //{startAddr:0x674e, endAddr:0x6751}, // 50000  cycles aprox
    //{startAddr:0x31c3, endAddr:0x3276},
    //{startAddr:0xe84e, endAddr:0xe902},
    //{startAddr:0xe564, endAddr:0xe657}
    //{startAddr:0x665F, endAddr:0x6798}, // main loop
    {startAddr:0x6A6A, endAddr:0x6B2B} // UART RX IRQ handler original
    //{startAddr:0x6A6A, endAddr:0x6A9A} // UART RX IRQ handler patched
];



function initProfiling() {
    for (let item of profilingItems) {
        item.active = false;
        item.cycles = 0;
    }
    function getCyclesTime(cycles) {
        let time_uS = Math.round((cycles*1000000)/921600);
        if (time_uS > 1000) {
            return (time_uS/1000).toFixed(3) + " mS";
        } else {
            return time_uS + ' uS';
        }
    }

    window.app.cpu.instruction_ticks.push((cycles, opcode_start_PC) => {
        for (let item of profilingItems) {
            
            if (item.startAddr == opcode_start_PC) {
                item.cycles = 0;
                item.active = true;
            }

            if (item.active) {
                item.cycles += cycles;
            }
            
            if(item.active && item.endAddr == opcode_start_PC) {
                item.active = false;
                log(`profiling of range ${hex(item.startAddr,4)} - ${hex(item.endAddr,4)} = ${item.cycles} cycles => ${getCyclesTime(item.cycles)}`);
            }
        }
    });
}