/**
 * 80c552_sfr.js
 *
 * Extends a bare js51 `_51cpu` instance with the Philips/NXP 80C552 SFR map
 * and its two-level interrupt system (IEN0/IP0 for the "classic" 8051
 * sources, IEN1/IP1 for the 552-specific sources: Timer2, ADC, I2C).
 *
 * Addresses below are taken from the Philips 80C552/83C552 datasheet and
 * cross-checked against the widely used `reg552.h` SDCC/Keil header. Ports
 * P0-P3 and the interrupt/timer/serial basics follow the same convention
 * js51's own install_default_peripherals() uses, but this file replaces
 * that function entirely (it targets the plain 8051, not the 552).
 *
 * NOTE on interrupt vector ordering: the extra (IEN1) interrupt sources are
 * wired here in the commonly documented order (Timer2 -> ADC -> I2C). Double
 * check this against your own datasheet copy if exact vector timing matters
 * for the REGO600 reverse-engineering work - Philips revised this table
 * between derivatives (80C552 vs 83C552 vs 8xC562) more than once.
 */

function get_80c552_ports() {
    return new Map([
        [0x80, "P0"],
        [0x90, "P1"],
        [0xA0, "P2"],
        [0xB0, "P3"],
        [0xC0, "P4"],
        [0xC4, "P5"],   // input-only port, also the ADC analog mux (P5.0-P5.7 = ADC0-ADC7)
    ])
}

function get_80c552_timers() {
    return new Map([
        [0x88, "TCON"],
        [0x89, "TMOD"],
        [0x8A, "TL0"],
        [0x8B, "TL1"],
        [0x8C, "TH0"],
        [0x8D, "TH1"],
        [0x87, "PCON"],
        // Timer T2 / capture-compare unit
        [0xC8, "TM2IR"],   // T2 interrupt request flags
        [0xC9, "CMH0"], [0xCA, "CMH1"], [0xCB, "CMH2"],
        [0xCC, "CTH0"], [0xCD, "CTH1"], [0xCE, "CTH2"], [0xCF, "CTH3"],
        [0xA9, "CML0"], [0xAA, "CML1"], [0xAB, "CML2"],
        [0xAC, "CTL0"], [0xAD, "CTL1"], [0xAE, "CTL2"], [0xAF, "CTL3"],
        [0xEA, "TM2CON"],
        [0xEB, "CTCON"],
        [0xEC, "TML2"],
        [0xED, "TMH2"],
        [0xEE, "STE"],
        [0xEF, "RTE"],
        // PWM + watchdog/T3
        [0xFC, "PWM0"],
        [0xFD, "PWM1"],
        [0xFE, "PWMP"],
        [0xFF, "T3"],
    ])
}

function get_80c552_serial() {
    return new Map([
        [0x98, "S0CON"],
        [0x99, "S0BUF"],
    ])
}

function get_80c552_i2c() {
    return new Map([
        [0xD8, "S1CON"],
        [0xD9, "S1STA"],
        [0xDA, "S1DAT"],
        [0xDB, "S1ADR"],
    ])
}

function get_80c552_adc() {
    return new Map([
        [0xC5, "ADCON"],
        [0xC6, "ADCH"],
    ])
}

function get_80c552_interrupt() {
    return new Map([
        [0xA8, "IEN0"],
        [0xB8, "IP0"],
        [0xE8, "IEN1"],
        [0xF8, "IP1"],
    ])
}

/**
 * Install the full 80C552 SFR set on `cpu` (a fresh js51 `_51cpu`) and wire
 * up its extended interrupt controller.
 *
 * @param {_51cpu} cpu
 * @returns {Map<String, reg>} name -> reg for every SFR installed
 */
function install_80c552_peripherals(cpu) {
    let regs = new Map([
        ...cpu.sfr_extend(get_80c552_ports()),
        ...cpu.sfr_extend(get_80c552_timers()),
        ...cpu.sfr_extend(get_80c552_serial()),
        ...cpu.sfr_extend(get_80c552_i2c()),
        ...cpu.sfr_extend(get_80c552_adc()),
        ...cpu.sfr_extend(get_80c552_interrupt()),
    ])

    // Port 4 GPIO defaults high (quasi-bidirectional ports float high with
    // no external pull-down); the membus code reads it for bank-select.
    regs.get("P4").set(0xFF)
    regs.get("P5").set(0xFF)

    // ---- Extended interrupt controller -----------------------------
    // IEN0: EA(7) - (6) ET2(5)* ES(4) ET1(3) EX1(2) ET0(1) EX0(0)
    //   * on 552 bit5 of IEN0 is often EAD/other; we route the extra
    //     sources purely through IEN1 below to keep this unambiguous.
    // IEN1: ETI(7) - EI2(5)/EFAP EAD(4) EC2(3) EC1(2) EC0(1) EX2(0)
    // The bit layout of IEN1 differs slightly across 552 datasheet
    // revisions; this implementation uses:
    //   IEN1.7 = ET2  (Timer2 / capture-compare group, TM2IR flags)
    //   IEN1.4 = EAD  (ADC conversion-complete, ADCON.4 ADCI flag)
    //   IEN1.5 = EI2  (I2C interrupt, S1STA activity)
    const IEN0 = regs.get("IEN0")
    const IP0 = regs.get("IP0")
    const IEN1 = regs.get("IEN1")
    const IP1 = regs.get("IP1")
    const TCON = regs.get("TCON")
    const S0CON = regs.get("S0CON")
    const TM2IR = regs.get("TM2IR")
    const ADCON = regs.get("ADCON")
    const S1STA = regs.get("S1STA")
    const S1CON = regs.get("S1CON")
    const TH0 = regs.get("TH0")
    const TL0 = regs.get("TL0")
    const TMOD = regs.get("TMOD")
    const TH1 = regs.get("TH1")
    const TL1 = regs.get("TL1")

    /*const default_irq = function () {
        const vIEN0 = IEN0.get()
        if (!(vIEN0 & 0x80)) return -1 // EA (global enable)

        const vTCON = TCON.get()
        const vSCON = S0CON.get()
        const vIEN1 = IEN1.get()

        // classic sources, vectors 0..4 (8051-compatible ordering)
        let IRQ = ((vTCON & 0x02) >> 1)        // 0: IE0
        IRQ |= ((vTCON & 0x20) >> 4)            // 1: TF0
        IRQ |= ((vTCON & 0x08) >> 1)            // 2: IE1
        IRQ |= ((vTCON & 0x80) >> 4)            // 3: TF1
        IRQ |= ((((vSCON >> 1) | vSCON) & 1) << 4) // 4: RI|TI serial

        const MAXIRQN = 8
        const IRQMASK = (1 << MAXIRQN) - 1
        let vIE = IRQMASK & IRQ & vIEN0

        // extended sources, vectors 5..7, gated by IEN1 (only meaningful
        // if the classic five above are all silent this pass; simple flat
        // priority scheme - swap in your own if the datasheet's priority
        // table matters for your firmware)
        if (vIE === 0) {
            let extIRQ = 0
            if ((TM2IR.get() & 0x3F) && (vIEN1 & 0x80)) extIRQ = -1       // ET2
            else if ((S1STA.get() !== 0xF8) && (vIEN1 & 0x20)) extIRQ = 5 // EI2 (idle status is 0xF8)
            else if ((ADCON.get() & 0x10) && (vIEN1 & 0x10)) extIRQ = -1   // EAD (ADCI)

            if (extIRQ === 0) return -1
            return extIRQ
        }

        const vIPM = IRQMASK & IP0.get()
        const sel = (vIE << MAXIRQN) | (vIE & vIPM)
        let IRQN = 0
        for (IRQN; IRQN < 2 * MAXIRQN; ++IRQN) {
            if (sel & (1 << IRQN)) break
        }
        IRQN %= MAXIRQN

        // hardware-cleared flags on vector entry, per 8051 convention
        if (IRQN === 0) TCON.set(vTCON & 0xFD)      // IE0
        else if (IRQN === 1) TCON.set(vTCON & 0xDF) // TF0
        else if (IRQN === 2) TCON.set(vTCON & 0xF7) // IE1
        else if (IRQN === 3) TCON.set(vTCON & 0x7F) // TF1
        // serial RI/TI is NOT auto-cleared on real hardware; software must
        // clear it in the ISR - left alone here to match that behaviour.

        return IRQN
    }*/

    const default_irq = function () {

        if (!(IEN0.get() & 0x80)) {
        
            return -1; // EA
        } 
        //console.log("irq enabled");

        let pending = [];

        const ien0 = IEN0.get();
        const ien1 = IEN1.get();

        const tcon = TCON.get();
        const scon = S0CON.get();

        // INT0
        if ((ien0 & 0x01) && (tcon & 0x02))
            pending.push(0);

        // TIMER0
        if ((ien0 & 0x02) && (tcon & 0x20))
            pending.push(1);

        // INT1
        if ((ien0 & 0x04) && (tcon & 0x08))
            pending.push(2);

        // TIMER1
        if ((ien0 & 0x08) && (tcon & 0x80)) {
            pending.push(3);
        }

        // UART0
        if ((ien0 & 0x10) && (scon & 0x03))
            pending.push(4);


        // I2C
        if ((ien0 & 0x20) && (S1CON.get() & I2C_BIT.SI)) {
            //console.log("i2c irq");
            pending.push(5);
        }


        // TIMER2
        if ((ien1 & 0x80) && TM2IR.get())
            pending.push(6);


        // ADC
        if ((ien1 & 0x10) && (ADCON.get() & 0x10))
            pending.push(7);


        if (pending.length === 0)
            return -1;

        // enklaste prioritet först
        if (pending[0] == 3) {
            TCON.set(TCON.get() & ~0x80); // Clear TF1
        } else if ( pending[0] == 1) {
            TCON.set(TCON.get() & ~0x20); // Clear TF0
        }
        return pending[0];
    };

        function update_timer0() {
        const tcon = TCON.get();

        if (!(tcon & 0x10))
            return; // TR0

        let count = (TH0.get() << 8) | TL0.get();

        count++;

        if (count > 0xFFFF) {
            count = 0;

            TCON.set(TCON.get() | 0x20); // TF0
        }

        TH0.set((count >> 8) & 0xff);
        TL0.set(count & 0xff);
    }

    function update_timer1() {

        const tcon = TCON.get();

        // TR1
        if (!(tcon & 0x40))
            return;

        switch ((TMOD.get() >> 4) & 0x03) {

            // Mode 0 (13-bit)
            case 0:
                break;

            // Mode 1 (16-bit)
            case 1: {
                let value = (TH1.get() << 8) | TL1.get();

                value++;

                if (value > 0xFFFF) {
                    value = 0;
                    TCON.set(TCON.get() | 0x80); // TF1
                }

                TH1.set((value >> 8) & 0xFF);
                TL1.set(value & 0xFF);
                break;
            }

            // Mode 2 (8-bit autoreload)
            case 2: {
                let tl = TL1.get() + 1;

                if (tl > 0xFF) {
                    tl = TH1.get();          // reload
                    TCON.set(TCON.get() | 0x80); // TF1
                }

                TL1.set(tl);
                break;
            }

            // Mode 3
            case 3:
                // Special mode - implement later if needed
                break;
        }
    }

    cpu.irq = default_irq
    cpu.peripheral_ticks.push(update_timer0);
    //cpu.peripheral_ticks.push(update_timer1);
    cpu.sfr = regs // convenience handle: cpu.sfr.get("ADCON") etc.
    return regs
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { install_80c552_peripherals }
}
