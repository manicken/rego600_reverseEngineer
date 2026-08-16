//--------interrupt service implement------

_51cpu.prototype.next = function (count = 1) {
    let cycles = 1
    for(let i = 0; i < count; ++i){
        cycles = this.execute_one();
        if(cycles == 0)
            return -1; // error
        if(this.addr_breakpoint.includes(this.PC.get()))
            return 0; // breakpoint reached
    }   
    return 1;
}

// Gör dessa globala variabler eller lägg dem som instansvariabler (this.cycleDebt etc) om du vill ha flera instanser
let lastFrameTime = performance.now();
let cycleDebt = 0; 
const CYCLES_PER_MS = 921.6;

_51cpu.prototype.emulatorLoop = function () {
    if (this.running === false) {
        return;
    }
    
    // Read the checkbox value dynamically from the HTML GUI at the start of every frame
    const isRealtime = this.isRealtime;//document.getElementById("chk-use_realTimeThrottle").checked;

    if (isRealtime) {
        // ====================================================================
        // LÄGE 1: REALTIME MODE (Cycle-Throttled Execution at exact ~921.6 kHz)
        // ====================================================================
        const now = performance.now();
        const elapsedMs = now - lastFrameTime;
        lastFrameTime = now;

        // Calculate how many CPU machine cycles should have elapsed in this time slice
        cycleDebt += elapsedMs * CYCLES_PER_MS * (this.speed_multipler?this.speed_multipler:1.0);

        // Prevent the cycle queue from exploding if the browser tab is unfocused/minimized
        if (cycleDebt > 921600) { 
            cycleDebt = 921600; // Cap at a maximum of 1 second buffer
        }

        // Execute opcodes sequentially until the cycle debt is paid off
        while (cycleDebt > 0) {
            let cyclesSpent = this.execute_one();
            
            // Safety break if an opcode execution error or invalid state occurs
            if (cyclesSpent <= 0) {
                this.running = false;
                return;
            }

            cycleDebt -= cyclesSpent;

            // Check if the current Program Counter matches a registered breakpoint
            if (this.addr_breakpoint.includes(this.PC.get())) {
                this.running = false;
                console.log("[EMULATOR] Breakpoint hit at 0x" + this.PC.get().toString(16));
                
                // Force a final UI render so the visual display matches the exact breakpoint state
                if (this.gui_render_handler) this.gui_render_handler();
                return;
            }
        }
    } else {
        // ====================================================================
        // LÄGE 2: FAST-FORWARD MODE (Unthrottled Turbo Speed)
        // ====================================================================
        // Keep the clock reference updated and clear the cycle debt while in Turbo.
        // This prevents a massive cycle backlog from freezing the VM when switching back to Realtime.
        lastFrameTime = performance.now();
        cycleDebt = 0; 

        // Execute a fixed chunk of instructions per frame as fast as the host CPU allows
        for (let i = 0; i < 50000; i++) {
            let cyclesSpent = this.execute_one();
            
            if (cyclesSpent <= 0) {
                this.running = false;
                return;
            }

            if (this.addr_breakpoint.includes(this.PC.get())) {
                this.running = false;
                console.log("[EMULATOR] Breakpoint hit at 0x" + this.PC.get().toString(16));
                if (this.gui_render_handler) this.gui_render_handler();
                return;
            }
        }
    }

    // Dispatch the GUI update handler once per animation frame when execution is done
    if (this.gui_render_handler) {
        this.gui_render_handler();
    }

    // Request the next animation frame from the browser window
    requestAnimationFrame(() => this.emulatorLoop());
}


_51cpu.prototype.start_emulator_loop = function() {
    this.running = true;
    lastFrameTime = performance.now(); // Nollställ tiden precis vid start så vi inte får en jätte-debt direkt
    cycleDebt = 0;
    
    // FIX: Samma sak här, starta med arrow-funktion
    requestAnimationFrame(() => this.emulatorLoop());
}

_51cpu.prototype.stop_emulator_loop = function() {
    this.running = false;
}

_51cpu.prototype.coutinue = function () {
    this.running = true; // Sätt flaggan om du vill köra continue-läge
    while(true){
        this.execute_one()
        if(this.addr_breakpoint.includes(this.PC.get()))
            break;
    }
}
