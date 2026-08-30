
let profilingItems = [
    /*{startAddr:0x6774, endAddr:0x6777},
    {startAddr:0x6777, endAddr:0x677A},
    {startAddr:0x677A, endAddr:0x677D},
    {startAddr:0x677D, endAddr:0x6780},
    {startAddr:0x6780, endAddr:0x6783},
    {startAddr:0x6783, endAddr:0x6786},
    {startAddr:0x6786, endAddr:0x6789},
    {startAddr:0x6789, endAddr:0x678C},
    {startAddr:0x678C, endAddr:0x678F},
    {startAddr:0x678F, endAddr:0x6792},
    {startAddr:0x6792, endAddr:0x6795},
    {startAddr:0x6795, endAddr:0x6798},*/
    //{startAddr:0x6774, endAddr:0x6798}, // 70000 cycles aprox
    //{startAddr:0x674b, endAddr:0x674e},
    //{startAddr:0x674e, endAddr:0x6751}, // 50000  cycles aprox
    //{startAddr:0x31c3, endAddr:0x3276},
    //{startAddr:0xe84e, endAddr:0xe902},
    //{startAddr:0xe564, endAddr:0xe657}
    //{startAddr:0x665F, endAddr:0x6798} // main loop
];



function initProfiling() {
    for (let item of profilingItems) {
        item.active = false;
        item.cycles = 0;
    }
    let cycleTime = 1000/921600;

    cpu.instruction_ticks.push((cycles, opcode_start_PC) => {
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
                console.log(`profiling of range ${hex(item.startAddr,4)} - ${hex(item.endAddr,4)} = ${item.cycles} cycles => ${item.cycles*cycleTime} mS`);
            }
        }
    });
}