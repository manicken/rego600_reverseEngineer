class DisasmLine {
    constructor() {
        /** @type {HTMLElement} */
        this.row_el = null;
        /** @type {HTMLElement} */
        this.breakpoint_el = null;
        /** @type {HTMLElement} */
        this.curr_exec_ptr_el = null;
        /** @type {HTMLElement} */
        this.address_el = null;
        /** @type {HTMLElement} */
        this.bytes_el = null;
        /** @type {HTMLElement} */
        this.mnemonic_el = null;
        /** @type {HTMLElement} */
        this.operands_el = null;
        /** @type {HTMLElement} */
        this.label_el = null;

        // Virtualisering: vilket instruktionsobjekt den här DOM-raden
        // just nu är bunden till. null = raden visar ingenting just nu (eller är en label-rad).
        this.data = null;
        // Hela display-list-posten (antingen {type:'insn',...} eller {type:'label',...}).
        this.item = null;
        // Index i disasmDisplayList för aktuell bindning, används för top-positionering.
        this.index = -1;
    }
}

let disasmContextMenu_el = undefined;
let disasmLineContext = undefined;

function initDisasmContextMenu() {
    disasmContextMenu_el = createNewElement("div", {
        className: "disasm-context-menu"
    });

    disasmContextMenu_el.innerHTML = `
        <div class="disasm-context-item" data-action="label">
            Set label...
        </div>
        <div class="disasm-context-item" data-action="comment">
            Add comment...
        </div>

        <div class="disasm-context-separator"></div>

        <div class="disasm-context-item" data-action="copy-address">
            Copy address
        </div>
        <div class="disasm-context-item" data-action="copy-raw-data">
            Copy raw data as text
        </div>
        <div class="disasm-context-item" data-action="copy-instruction">
            Copy instruction
        </div>

        <div class="disasm-context-separator"></div>

        <div class="disasm-context-item" data-action="breakpoint">
            Toggle breakpoint
        </div>
    `;

    document.body.appendChild(disasmContextMenu_el);

    disasmContextMenu_el.addEventListener("click", (event) => {
        const item = event.target.closest(".disasm-context-item");

        if (!item)
            return;

        const action = item.dataset.action;
        const line = disasmLineContext;

        hideDisasmContextMenu();

        if (!line || !line.data)
            return;

        if (action === "label") {
            setDisasmLabel(line);
        }
        else if (action === "comment") {
            setDisasmComment(line);
        }
        else if (action === "copy-address") {
            navigator.clipboard.writeText(hex(line.data.addr, 4));
        }
        else if (action === "copy-raw-data") {
            const rawBytesText = line.data.bytes.map(b => hex(b, 2, false)).join(' ');
            navigator.clipboard.writeText(rawBytesText);
        }
        else if (action === "copy-instruction") {
            let insn = line.data;
            let text = insn.operands ? (insn.mnemonic + ' ' + insn.operands.join(',')) : insn.mnemonic
            navigator.clipboard.writeText(text);
        }
        else if (action === "breakpoint") {
            toggleDisasmBreakpoint(line);
        }
    });

    document.addEventListener("click", () => {
        hideDisasmContextMenu();
    });

    document.addEventListener("contextmenu", (event) => {
        if (!event.target.closest(".disassembly-grid-row")) {
            hideDisasmContextMenu();
        }
    });
}

function setDisasmLabel(line) {
    if (!line.data)
        return; // kan bara sätta etikett på en instruktionsrad, inte på en label-rad

    const addr = line.data.addr;
    const current = line.data.label || "";
    const text = window.prompt("Etikett vid " + hex(addr, 4) + ":", current);

    if (text === null)
        return; // avbrutet

    if (text.trim() === "")
        line.data.label = undefined;//.delete(addr);
    else
        line.data.label = text.trim();//.set(addr, text.trim());

    // Etiketter lägger till/tar bort en rad i display-listan, så hela listan
    // (och sizer-höjden) måste byggas om.
    rebuildDisasmDisplayList();
    renderVisibleDisasmRows();
}

function setDisasmComment(line) {
    if (!line.data)
        return;

    const addr = line.data.addr;
    const current = disasmComments.get(addr) || "";
    const text = window.prompt("Kommentar vid " + hex(addr, 4) + " (visas som tooltip):", current);

    if (text === null)
        return;

    if (text.trim() === "")
        disasmComments.delete(addr);
    else
        disasmComments.set(addr, text.trim());

    // Kommentarer tar ingen egen rad - bara title-attributet på berörd rad behöver uppdateras.
    renderVisibleDisasmRows();
}

function toggleDisasmBreakpoint(line) {
    if (!line.data)
        return;

    const addr = line.data.addr;

    if (disasmBreakpoints.has(addr)) {
        disasmBreakpoints.delete(addr);
        line.breakpoint_el.textContent = " ";
        cpu.remove_addr_break(addr);
    } else {
        disasmBreakpoints.add(addr);
        line.breakpoint_el.textContent = "⬤";
        cpu.set_addr_break(addr);
    }
}

function showDisasmContextMenu(event, disasmLine) {
    event.preventDefault();
    event.stopPropagation();

    disasmLineContext = disasmLine;

    const menu = disasmContextMenu_el;

    menu.style.display = "block";

    // Positionera först ungefär där musen är
    let x = event.clientX;
    let y = event.clientY;

    // Hindra menyn från att gå utanför fönstret
    const rect = menu.getBoundingClientRect();

    if (x + rect.width > window.innerWidth)
        x = window.innerWidth - rect.width - 4;

    if (y + rect.height > window.innerHeight)
        y = window.innerHeight - rect.height - 4;

    menu.style.left = `${Math.max(4, x)}px`;
    menu.style.top = `${Math.max(4, y)}px`;
}

function hideDisasmContextMenu() {
    if (disasmContextMenu_el)
        disasmContextMenu_el.style.display = "none";

    disasmContextAddress = undefined;
}


// ============================================================
// Virtualiserad disassembly-lista
// ============================================================

let disasm_live_update = true;
let disasm_auto_scroll = true;
let disasmNeedsRebuild = false;

/** Extra rader ovanför/under synligt område, buffert mot vitt hack vid snabb scroll */
const DISASM_BUFFER_ROWS = 8;

/** @type {Array<{addr:number, bytes:number[], mnemonic:string, operands:string, text:string}>} */
let disasmEntries = [];            // sorterad, ren datalista över instruktioner - ingen DOM per rad

/** @type {Map<number,string>} */
//let disasmLabels = new Map();      // addr -> etikett-text, visas som egen rad ovanför instruktionen
/** @type {Map<number,string>} */
let disasmComments = new Map();    // addr -> kommentar-text, visas som tooltip (title) vid hover

/** @type {Array<{type:'insn', insn:Object}|{type:'label', addr:number, text:string}>} */
let disasmDisplayList = [];        // disasmEntries + insprängda label-rader, det virtualiseringen itererar över
/** @type {Map<number, number>} */
let disasmAddrToIndex = new Map(); // addr -> index i disasmDisplayList (för instruktionsraden, inte ev. label-rad)

/** @type {Set<number>} */
let disasmBreakpoints = new Set(); // adresser med breakpoint satt (state hör till adressen, inte till en DOM-nod)

/** @type {DisasmLine[]} */
let disasmPool = [];               // återanvända DOM-rader, storlek << disasmEntries.length

let disasmSizer_el = null;         // ger scrollbaren rätt totalhöjd, rader positioneras absolut i denna
let disasmViewport_el = null;      // det scrollande elementet (motsvarar gamla disasmScroll_el)
let disasmScroll_el;               // alias, ifall något annat i koden refererar till detta namn

let currentExecAddr = null;        // adress PC pekar på just nu
let rowHeight = 20;

let disasmRenderScheduled = false;
let disasmResizeTimer = null;

/**
 * Bygger om disasmDisplayList från disasmEntries + disasmLabels, och disasmAddrToIndex
 * från resultatet. Anropas vid start och varje gång en etikett läggs till/tas bort
 * (kommentarer påverkar inte listan, bara title-attributet på berörd rad).
 */
function rebuildDisasmDisplayList() {
    const list = [];

    for (const insn of disasmEntries) {
        const label = insn.label;// disasmLabels.get(insn.addr);
        if (label)
            list.push({ type: "label", addr: insn.addr, text: label });

        list.push({ type: "insn", insn });
    }

    disasmDisplayList = list;

    disasmAddrToIndex = new Map();
    list.forEach((item, i) => {
        if (item.type === "insn")
            disasmAddrToIndex.set(item.insn.addr, i);
    });

    if (disasmSizer_el && rowHeight)
        disasmSizer_el.style.height = (disasmDisplayList.length * rowHeight) + "px";
}

let insn_map = null;
// {addr:0x, label:""},

let entry_points_3021 = [
    {addr:0x0000, label:"reset", comment:"Program execution starts here."}, 
    {addr:0x000B, label:"TIMER0_IRQ_VECTOR"}, 
    {addr:0x0023, label:"UART_IRQ_VECTOR"},
    {addr:0x002B, label:"I2C_IRQ_VECTOR"},
];

let entry_points_3060 = [
    {addr:0x0000, label:"reset", comment:"Program execution starts here."}, 
    {addr:0x000B, label:"TIMER0_IRQ_VECTOR"}, 
    {addr:0x0023, label:"UART_IRQ_VECTOR"},
    {addr:0x002B, label:"I2C_IRQ_VECTOR"},
    {addr:0x002E, label:"START_AFTER_RESET_VECTOR"}, 
    {addr:0x0136, label:"sensor_apply_gain_offset"},
    {addr:0x0160, label:"signed_divide_16bit_wrapper"},
    {addr:0x069E, label:"CMD_DISPATCH_TABLE_LOOKUP"},
    {addr:0x0883, label:"ReadMemory_to_R5_R6_R7"},
    {addr:0x0889, label:"ReadSelectedMemoryType"},
    {addr:0x0A16, label:"SetupMemoryAccessAbsolute"},
    {addr:0x0A3A, label:"SetupMemoryAccessOffset"},
    {addr:0x0B5A, label:"intmem_read_3bytes_to_R5_R6_R7"},
    {addr:0x67D7, label:"extram_zerofill"}, 
    {addr:0x6829, label:"TIMER0_IRQ_HANDLER"}, 

    {addr:0x6869, label:"I2C_IRQ_HANDLER"},
    {addr:0x68EE, label:"i2c_status_08"},
    {addr:0x68FD, label:"i2c_status_10"},
    {addr:0x690C, label:"i2c_status_18"},
    {addr:0x691B, label:"i2c_status_20"},
    {addr:0x692D, label:"i2c_status_28"},
    {addr:0x6951, label:"i2c_status_30"},
    {addr:0x695C, label:"i2c_status_38"},
    {addr:0x696A, label:"i2c_status_40"},
    {addr:0x696F, label:"i2c_status_48"},
    {addr:0x697A, label:"i2c_status_50"},
    {addr:0x698C, label:"i2c_status_58"},
    {addr:0x69A7, label:"i2c_status_others"},
    {addr:0x69BA, label:"i2c_status_common_end"},

    {addr:0x6A42, label:"UART_RX_START_BYTE_CHECK"},
    {addr:0x6A6A, label:"UART_IRQ_HANDLER"},
    {addr:0x6B2C, label:"UART_SEND_ONE_BYTE"},

    {addr:0x6B48, label:"Read_DS1302_byte"}, // RTC
    {addr:0x6B72, label:"DS1302_BurstRead_DateTime"},
    {addr:0x6BF1, label:"DS1302_Write_Register_Byte"},
    {addr:0x6C6A, label:"DS1302_Read_Register_Byte"},
    {addr:0x6CB4, label:"DS1302_WriteTimeFromTemporary"},
    {addr:0x6CE2, label:"DS1302_RTC_init"},

    {addr:0x8919, label:"UART_SEND_AS_3_BYTES_PLUS_CHECKSUM"},
    {addr:0x8A81, label:"uart_cmd_01_front_panel_write"},
    {addr:0x8A9E, label:"uart_cmd_02_sys_reg_read"},
    {addr:0x8AB5, label:"uart_cmd_03_sys_reg_write"},
    {addr:0x8AE1, label:"uart_cmd_04_timer_reg_read"},
    {addr:0x8AFA, label:"uart_cmd_05_timer_reg_write"},
    {addr:0x8B16, label:"uart_cmd_06_menu_reg_read"},
    {addr:0x8B2E, label:"uart_cmd_07_menu_reg_write"},
    {addr:0x8B4A, label:"uart_cmd_20_display_reg_read"},
    {addr:0x8B5F, label:"uart_cmd_40_read_last_error_line"},
    {addr:0x8B73, label:"uart_cmd_42_read_prev_error_line"},
    {addr:0x8B87, label:"uart_cmd_7F_read_rego_ver"},
    {addr:0x8B90, label:"uart_cmd_reset_rx_index"},
];

let entry_points_3120 = [
    {addr:0x0000, label:"reset", comment:"Program execution starts here."}, 
    {addr:0x000B, label:"TIMER0_IRQ_VECTOR"}, 
    {addr:0x0023, label:"UART_IRQ_VECTOR"},
    {addr:0x002B, label:"I2C_IRQ_VECTOR"},
];

let versions = [
    {ver:"3.021", entry_points: entry_points_3021, targets:["rego634"],           hash:"4AE4D6CE67A84CEE2CCC19738CF3BDD91D865238FE8DC4822DE0D291F5F4EA8B"},
    {ver:"3.06", entry_points: entry_points_3060, targets:["rego637","rego637e"], hash:"BD8E616AE8F6B31BB731104EBEE6154A3DD8DD7DC07E0153915ADFEDC2BA291E"},
    {ver:"3.12", entry_points: entry_points_3120, targets:["rego637w"],           hash:"63827F591D37163F2DA75BE7323F6EB70478277A0243C898E79DE14475524F1B"}
];
// currently cheat by just setting it directly
let entry_points = entry_points_3060;

function disassembly_init() {

    cpu.instruction_ticks.push((cycles, pc) => {
        if (!insn_map.has(pc)) {
            console.log("new code:", hex(pc, 4));

            entry_points.push(pc);

            js51_disasm.disassemble_recursive(
                cpu.CODE,
                [pc],
                cpu.SFR,
                insn_map
            );

            disasmNeedsRebuild = true;
        }
    });

    //let entry_points = ;//, 0x7863, 0x7841, 0x788F, 0x780C, 0x693D, 0x04D4, 0x0B36, 0x8218, 0x0B2E, 0x0B25, 0xEF2E, 0x694C, 0x6940, 0x692D, 0x6935, 0x6D26, 0x692F, 0xEF37, 0x04D0, 0x0B3B];

    insn_map = js51_disasm.disassemble_recursive(cpu.CODE, entry_points, cpu.SFR);

    // Bygg en sorterad, ren datalista - inga DOM-noder skapas per instruktion längre
    const addrs = [...insn_map.keys()].sort((a, b) => a - b);
    disasmEntries = addrs.map(addr => insn_map.get(addr));
    //console.log(disasmEntries);

    rebuildDisasmDisplayList(); // bygger disasmDisplayList + disasmAddrToIndex (inga etiketter satta ännu, så = disasmEntries)

    initDisasmContextMenu();
    const disassemblyView_el = document.getElementById("disassemblyView");

    // Live tracking checkbox
    let liveTracking_ToolTip = "Enable live tracing while the simulator runs, stepping however always use Tracking";
    appendCheckBoxWithLabel(disassemblyView_el,
        { label: "Live Tracking", tooltip: liveTracking_ToolTip, state: disasm_live_update, style: { marginLeft: "10px", marginBottom: "10px" } },
        (value) => { disasm_live_update = value; }
    );

    let autoscroll_ToolTip = "Enable live tracing scrolling while the simulator runs, stepping however always use Tracking";
    appendCheckBoxWithLabel(disassemblyView_el,
        { label: "Live Scroll", tooltip: autoscroll_ToolTip, state: disasm_auto_scroll, style: { marginLeft: "10px", marginBottom: "10px" } },
        (value) => { disasm_auto_scroll = value; }
    );

    // Scrollande viewport (samma roll som gamla container_el)
    let viewport_el = createNewElement("div", { className: "disassembly-container" });
    disasmScroll_el = viewport_el;
    disasmViewport_el = viewport_el;

    // Sizer: ger scrollbaren rätt totalhöjd (antal rader * rowHeight) utan
    // att varje rad faktiskt existerar i DOM:en. Raderna positioneras absolut i denna.
    disasmSizer_el = createNewElement("div", { className: "disassembly-grid" });
    disasmSizer_el.style.position = "relative"; // sätts direkt, se kommentar i buildPoolRow
    viewport_el.appendChild(disasmSizer_el);

    // Header (statisk, virtualiseras inte)
    let header_el = createNewElement("div", { className: "disassembly-grid-row disassembly-grid-header" });
    appendNewElement(header_el, "div", { className: "disassembly-breakpoint", textContent: "" });
    appendNewElement(header_el, "div", { className: "disassembly-curr-exec", textContent: "" });
    appendNewElement(header_el, "div", { className: "disassembly-address", textContent: "Addr." });
    appendNewElement(header_el, "div", { className: "disassembly-bytes", textContent: "Bytes" });
    appendNewElement(header_el, "div", { className: "disassembly-mnemonic", textContent: "OP" });
    appendNewElement(header_el, "div", { className: "disassembly-operands", textContent: "Operands" });
    disassemblyView_el.appendChild(header_el);

    disassemblyView_el.appendChild(viewport_el);

    // Mät radhöjd med TVÅ rader och ta avståndet mellan deras topp-kanter,
    // inte en enda rads offsetHeight. Fångar upp ev. row-gap/marginal i CSS:en
    // som annars ger en drift som växer ju längre ner man scrollar.
    const probeA = buildPoolRow();
    const probeB = buildPoolRow();
    probeA.row_el.style.top = "0px";
    probeB.row_el.style.top = "0px"; // sätts om nedan, bara för att tvinga layout
    disasmSizer_el.appendChild(probeA.row_el);
    disasmSizer_el.appendChild(probeB.row_el);
    probeB.row_el.style.top = probeA.row_el.offsetHeight + "px";

    const rectA = probeA.row_el.getBoundingClientRect();
    const rectB = probeB.row_el.getBoundingClientRect();
    const measured = rectB.top - rectA.top;
    rowHeight = measured > 0 ? measured : (probeA.row_el.offsetHeight || rowHeight);

    probeA.row_el.remove();
    probeB.row_el.remove();

    rebuildDisasmDisplayList(); // sätter nu sizer-höjden också, med korrekt rowHeight

    initDisasmPool();
    renderVisibleDisasmRows();

    viewport_el.addEventListener("scroll", onDisasmScroll, { passive: true });

    // ResizeObserver istället för window "resize": fångar även fallet där panelen
    // inte hade sin slutgiltiga höjd (t.ex. dold flik) när poolen skapades ovan.
    const disasmResizeObserver = new ResizeObserver(() => onDisasmResize());
    disasmResizeObserver.observe(viewport_el);

    //loading_el.remove();
    setCurrentExecLine(cpu, true);

    console.log("disassembly: " + disasmEntries.length + " rows, rowHeight=" + rowHeight + ", pool=" + disasmPool.length + ", viewport clientHeight=" + viewport_el.clientHeight);

}

/** Skapar en enda pool-rad (DOM), obunden till någon instruktion ännu. */
function buildPoolRow() {
    let row_el = createNewElement("div", { className: "disassembly-grid-row" });

    // Sätts direkt på style-objektet (inte via createNewElement:s props) - createNewElement
    // verkar inte stödja ett nästlat "style"-objekt, vilket gjorde att position:absolute
    // aldrig applicerades och raderna låg kvar i normalt (statiskt) dokumentflöde.
    row_el.style.position = "absolute";
    row_el.style.left = "0";
    row_el.style.right = "0";
    row_el.style.top = "0px";

    const disasmLine = new DisasmLine();
    disasmLine.row_el = row_el;

    disasmLine.breakpoint_el = appendNewElement(row_el, "div", { className: "disassembly-breakpoint", textContent: " " });
    disasmLine.curr_exec_ptr_el = appendNewElement(row_el, "div", { className: "disassembly-curr-exec-ptr" });
    disasmLine.address_el = appendNewElement(row_el, "div", { className: "disassembly-address" });
    disasmLine.bytes_el = appendNewElement(row_el, "div", { className: "disassembly-bytes" });
    disasmLine.mnemonic_el = appendNewElement(row_el, "div", { className: "disassembly-mnemonic" });
    disasmLine.operands_el = appendNewElement(row_el, "div", { className: "disassembly-operands" });

    // Etikett-rad: dold som standard, visas istället för de vanliga cellerna när
    // raden är bunden till en {type:'label'}-post. ".disassembly-label" finns redan
    // i CSS:en med grid-column:1/-1, så den spänner över hela raden.
    disasmLine.label_el = appendNewElement(row_el, "div", { className: "disassembly-label" });
    disasmLine.label_el.style.display = "none";

    disasmLine.breakpoint_el.onclick = () => {
        toggleDisasmBreakpoint(disasmLine);
    };

    row_el.addEventListener("contextmenu", (event) => {
        if (disasmLine.data)
            showDisasmContextMenu(event, disasmLine);
    });

    return disasmLine;
}

function initDisasmPool() {
    const visibleRows = Math.ceil(disasmViewport_el.clientHeight / rowHeight);
    const poolSize = Math.min(disasmDisplayList.length, visibleRows + DISASM_BUFFER_ROWS * 2);

    disasmPool = [];
    for (let i = 0; i < poolSize; i++) {
        const line = buildPoolRow();
        line.row_el.style.display = "none";
        disasmSizer_el.appendChild(line.row_el);
        disasmPool.push(line);
    }
}

/** Växer poolen om fönstret blir större (krymper aldrig - onödigt att churna DOM). */
function resizeDisasmPool() {
    const visibleRows = Math.ceil(disasmViewport_el.clientHeight / rowHeight);
    const needed = Math.min(disasmDisplayList.length, visibleRows + DISASM_BUFFER_ROWS * 2);

    while (disasmPool.length < needed) {
        const line = buildPoolRow();
        line.row_el.style.display = "none";
        disasmSizer_el.appendChild(line.row_el);
        disasmPool.push(line);
    }
}

function onDisasmResize() {
    clearTimeout(disasmResizeTimer);
    disasmResizeTimer = setTimeout(() => {
        resizeDisasmPool();
        renderVisibleDisasmRows();
    }, 100);
}

function onDisasmScroll() {
    if (disasmRenderScheduled)
        return;

    disasmRenderScheduled = true;
    requestAnimationFrame(() => {
        disasmRenderScheduled = false;
        renderVisibleDisasmRows();
    });
}

/** Binder om poolens rader till rätt fönster av disasmDisplayList baserat på scrollTop. */
function renderVisibleDisasmRows() {
    if (disasmDisplayList.length === 0 || disasmPool.length === 0)
        return;

    const scrollTop = disasmViewport_el.scrollTop;
    const firstVisible = Math.floor(scrollTop / rowHeight);

    let startIndex = firstVisible - DISASM_BUFFER_ROWS;
    if (startIndex < 0) startIndex = 0;

    const maxStart = Math.max(0, disasmDisplayList.length - disasmPool.length);
    if (startIndex > maxStart) startIndex = maxStart;

    for (let slot = 0; slot < disasmPool.length; slot++) {
        const index = startIndex + slot;
        const line = disasmPool[slot];

        if (index >= disasmDisplayList.length) {
            line.row_el.style.display = "none";
            line.data = null;
            line.item = null;
            line.index = -1;
            continue;
        }

        bindPoolRow(line, disasmDisplayList[index], index);
    }
}

/** Sätter en pool-rads innehåll/position till en given display-list-post (instruktion eller etikett). */
function bindPoolRow(line, item, index) {
    line.item = item;
    line.index = index;

    line.row_el.style.display = "";
    line.row_el.style.top = (index * rowHeight) + "px";

    if (item.type === "label") {
        line.data = null;
        line.row_el.classList.add("disassembly-label-row");
        line.row_el.title = "";

        line.breakpoint_el.style.display = "none";
        line.curr_exec_ptr_el.style.display = "none";
        line.address_el.style.display = "none";
        line.bytes_el.style.display = "none";
        line.mnemonic_el.style.display = "none";
        line.operands_el.style.display = "none";

        line.label_el.style.display = "";
        line.label_el.textContent = item.text + ":";
        return;
    }

    const insn = item.insn;
    line.data = insn;
    line.row_el.classList.remove("disassembly-label-row");

    line.label_el.style.display = "none";
    line.breakpoint_el.style.display = "";
    line.curr_exec_ptr_el.style.display = "";
    line.address_el.style.display = "";
    line.bytes_el.style.display = "";
    line.mnemonic_el.style.display = "";
    line.operands_el.style.display = "";

    line.address_el.textContent = hex(insn.addr, 4, false);
    line.bytes_el.textContent = insn.bytes.map(b => hex(b, 2, false)).join(' ');
    line.mnemonic_el.textContent = insn.mnemonic;
    line.operands_el.textContent = insn.operands?insn.operands.join(','):"";

    line.breakpoint_el.textContent = disasmBreakpoints.has(insn.addr) ? "⬤" : " ";
    line.curr_exec_ptr_el.classList.toggle("current-exec", insn.addr === currentExecAddr);

    // Kommentar visas som native tooltip på hela raden - tar ingen plats i vyn.
    line.row_el.title = disasmComments.get(insn.addr) || "";
}

function rebuildDisasm_ifNeeded(){
    if (disasmNeedsRebuild == false) {
        return false;
    }
    disasmNeedsRebuild = false;
    const addrs = [...insn_map.keys()].sort((a, b) => a - b);
    disasmEntries = addrs.map(addr => insn_map.get(addr));

    rebuildDisasmDisplayList();
    return true;
}

function scrollToIndex(index) {
    const target = index * rowHeight - (disasmViewport_el.clientHeight - rowHeight) / 2;
    disasmViewport_el.scrollTop = Math.max(0, target);
}


function setCurrentExecLine(cpu, force = false) {
    
    const address = cpu.PC.get();

    if (!disasm_live_update && !force) {
        if (rebuildDisasm_ifNeeded()) {
            let index = disasmAddrToIndex.get(address);
            if (index != undefined) {
                //scrollToIndex(index);
                renderVisibleDisasmRows();
            }
        }
        return;
    }
    rebuildDisasm_ifNeeded();

    
    currentExecAddr = address;

    if (address == 0x8b87) {
        console.log("uart get ver cmd 7f");
    } else if (address == 0x8a9e) {
         console.log("uart read sysreg cmd 02");
    }

    let index = disasmAddrToIndex.get(address);
    let insn = insn_map.get(address);
    if (index === undefined || insn === undefined) {
        //console.log("asdress not disasm, executing disasm:" + hex(address,4));
        entry_points.push(address); // push so that we can save it to local storage later to avoid same sitaution again
        insn_map = js51_disasm.disassemble_recursive(cpu.CODE, [address], cpu.SFR, insn_map);
        const addrs = [...insn_map.keys()].sort((a, b) => a - b);
        disasmEntries = addrs.map(addr => insn_map.get(addr));
        rebuildDisasmDisplayList();

        index = disasmAddrToIndex.get(address);
    }

    if ((disasm_auto_scroll || force) && disasmViewport_el) {
        scrollToIndex(index);
    }

    // Uppdatera markeringen även när vi inte scrollade (Live Scroll avstängd men Live Tracking på).
    renderVisibleDisasmRows();
}