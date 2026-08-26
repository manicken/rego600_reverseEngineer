

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

const DisAsmLineType = {
    Label:0,
    Instruction:1
};

function gotoDisasmAddress(addr) {

    const index = disasmAddrToIndex.get(addr);

    if (index === undefined) {
        console.log("could not find addr index for " + hex(addr,4));
        return false;
    }
    //console.log("scrolling to index: " + index);
    scrollToIndex(index);
    return true;
}

function editCode() {
    let line = disasmLineContext;
    window.hex_edit_modal.open();
    window.hexEditor.loadBytes(cpu.CODE);
    window.hexEditor.jumpTo(line.data.addr);
}

function gotoAddress() {
    const text = window.prompt("Goto address (hex): ", "");

    if ((text === null) || (text.trim() === ""))
        return; // cancel

    gotoDisasmAddress(parseInt(text, 16));
}

function gotoTarget() {
    let line = disasmLineContext;
    
    if (gotoDisasmAddress(line.data.target)) {
        gotoTargetList.push(line.data.addr);
    }
}

function gotoTarget_Back() {
    if (gotoTargetList.length != 0) {
        gotoDisasmAddress(gotoTargetList.pop());
    }
}

function getSelectedItems() {
    const range = getSelectedRange();

    return disasmDisplayList.slice(range.start, range.end + 1);
}

function copyDisassembly() {
    let text = "";

    getSelectedItems().forEach(item => {
        if (item.type == DisAsmLineType.Instruction) {
            text += item.insn.text() + '\n';
        } else if (item.type == DisAsmLineType.Label) {
            text += '\n' + item.text + ':\n';
        }
    });
    navigator.clipboard.writeText(text);
}

function copyAddress() {
    let text = "";
    getSelectedItems().forEach(item => {
        if (item.type == DisAsmLineType.Instruction) {
            text += hex(item.insn.addr, 4) + '\n';
        } else if (item.type == DisAsmLineType.Label) {
            text += '\n' + item.text + ':\n';
        }
    });
   //const text = hex(disasmLineContext.data.addr, 4);
    navigator.clipboard.writeText(text);
}
function copyRawData() {
    let text = "";
    getSelectedItems().forEach(item => {
        if (item.type == DisAsmLineType.Instruction) {
            text += item.insn.bytes.map(b => hex(b, 2, false)).join(' ') + '\n';
        } else if (item.type == DisAsmLineType.Label) {
            text += '\n' + item.text + ':\n';
        }
    });
    //const text = disasmLineContext.data.bytes.map(b => hex(b, 2, false)).join(' ');
    navigator.clipboard.writeText(text);
}

function copyInstruction() {
    let text = "";
    getSelectedItems().forEach(item => {
        if (item.type == DisAsmLineType.Instruction) {
            const insn = item.insn;
            const opText = insn.operands ? (insn.mnemonic + ' ' + insn.operands.join(',')) : insn.mnemonic;
            text += opText + '\n';
        } else if (item.type == DisAsmLineType.Label) {
            text += '\n' + item.text + ':\n';
        }
    });
    navigator.clipboard.writeText(text);
}

function editDisasmLabel() {
    let line = disasmLineContext;
    if (!line.data)
        return; // can only set a label on a instruction row not on a label row, TODO make it possible to right click on labels and edit them directly

    const addr = line.data.addr;
    const current = line.data.label || "";
    const text = window.prompt("Label @ " + hex(addr, 4) + ":", current);

    if (text === null)
        return; // cancel

    if (text.trim() === "")
        line.data.label = undefined;
    else
        line.data.label = text.trim();

    line.data.labelType = js51_disasm.LabelType.User;

    for (const insn of disasmEntries) {
        if (insn.target == addr) {
            
            insn.operands[insn.operands.length-1] = line.data.label?line.data.label:hex(addr,4);
        }
    }

    // Etiketter lägger till/tar bort en rad i display-listan, så hela listan
    // (och sizer-höjden) måste byggas om.
    rebuildDisasmDisplayList();
    renderVisibleDisasmRows();
}

function editDisasmComment() {
    let line = disasmLineContext;
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

function toggleDisasmBreakpoint() {
    let line = disasmLineContext;
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
        const label = insn.label;
        if (label)
            list.push({ type: DisAsmLineType.Label, addr: insn.addr, text: label });

        list.push({ type: DisAsmLineType.Instruction, insn });
    }

    disasmDisplayList = list;

    disasmAddrToIndex = new Map();
    list.forEach((item, i) => {
        if (item.type === DisAsmLineType.Instruction)
            disasmAddrToIndex.set(item.insn.addr, i);
    });

    if (disasmSizer_el && rowHeight)
        disasmSizer_el.style.height = (disasmDisplayList.length * rowHeight) + "px";
}

let insn_map = null;
// {addr:0x, label:""},


function disassembly_init() {

    cpu.instruction_ticks.push((cycles, pc) => {
        if (!insn_map.has(pc)) {
            console.log("new code:", hex(pc, 4));

            curr_firmware.entry_points.push(pc);

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
    console.log(curr_firmware.entry_points);
    insn_map = js51_disasm.disassemble_recursive(cpu.CODE, curr_firmware.entry_points, cpu.SFR);
    console.log(insn_map);
    // Bygg en sorterad, ren datalista - inga DOM-noder skapas per instruktion längre
    const addrs = [...insn_map.keys()].sort((a, b) => a - b);
    disasmEntries = addrs.map(addr => insn_map.get(addr));
    console.log(disasmEntries);

    rebuildDisasmDisplayList(); // bygger disasmDisplayList + disasmAddrToIndex (inga etiketter satta ännu, så = disasmEntries)

    initDisasmContextMenu();
    const disassemblyView_el = document.getElementById("disassemblyView");
    const disasmToolBar_el = appendNewElement(disassemblyView_el, 'div', {className:"panel"});

    // Live tracking checkbox
    let liveTracking_ToolTip = "Enable live tracing while the simulator runs, stepping however always use Tracking";
    appendCheckBoxWithLabel(disasmToolBar_el,
        { label: "Live Tracking", tooltip: liveTracking_ToolTip, state: disasm_live_update, style: { marginLeft: "10px", marginBottom: "10px" } },
        (value) => { disasm_live_update = value; }
    );

    let autoscroll_ToolTip = "Enable live tracing scrolling while the simulator runs, stepping however always use Tracking";
    appendCheckBoxWithLabel(disasmToolBar_el,
        { label: "Live Scroll", tooltip: autoscroll_ToolTip, state: disasm_auto_scroll, style: { marginLeft: "20px", marginBottom: "10px" } },
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

    initSelectFunctionality(disassemblyView_el);
}

let isDragging = false;

let selStartIndex = null;
let selEndIndex= null;

function getSelectedRange() {
  if (selStartIndex === null || selEndIndex === null) return {start:0, end:0, length:0};
  const start = Math.min(selStartIndex, selEndIndex);
  const end = Math.max(selStartIndex, selEndIndex)
  return {start, end, length:end-start, includes(value) { return (value >= start) && (value <= end); }};
}

function initSelectFunctionality(disassemblyView_el) {
    /**
     * drag select functionality
     */
    

    disassemblyView_el.addEventListener('mousedown', (e) => {
        const selCount = getSelectedRange().length;

        if (e.button != 0 && selCount > 1 ) {
            return;
        }
        const row = e.target.closest('.disassembly-grid-row');

        if (!row) return;

        isDragging = true;
        selStartIndex = row.dataSource.index;
        selEndIndex = selStartIndex;
        updateSelectionHighlight();
        renderVisibleDisasmRows();
        e.preventDefault(); // undvik textmarkering i browsern
        console.log("start drag");
    });

    disassemblyView_el.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const row = e.target.closest('.disassembly-grid-row');

        if (!row) return; // musen är utanför en rad (t.ex. mellanrum) - ignorera tick
        
        selEndIndex = row.dataSource.index;
        updateSelectionHighlight();
        renderVisibleDisasmRows();
        console.log("dragging");
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        console.log("stop dragging");
    });

    function updateSelectionHighlight() {
        const range = getSelectedRange();
        for (let i=0; i< disasmDisplayList.length; i++) {
            disasmDisplayList[i].selected = range.includes(i);
        }
    }
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

    row_el.onclick

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
        if (disasmLine.data) {
            showDisasmContextMenu(event, disasmLine);
        }
    });

    return disasmLine;
}

function initDisasmPool() {
    const visibleRows = Math.ceil(disasmViewport_el.clientHeight / rowHeight);
    const poolSize = Math.min(disasmDisplayList.length, visibleRows + DISASM_BUFFER_ROWS * 2);

    disasmPool = [];
    for (let i = 0; i < poolSize; i++) {
        const line = buildPoolRow();
        line.row_el.dataset.index = i;
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
        line.row_el.dataset.index = disasmPool.length-1;
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
    line.row_el.classList.remove('selected');
    if (item.selected) {
        line.row_el.classList.add('selected');
    }
    line.row_el.style.top = (index * rowHeight) + "px";
    line.row_el.dataSource = line;

    if (item.type === DisAsmLineType.Label) {
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
        curr_firmware.entry_points.push(address); // push so that we can save it to local storage later to avoid same sitaution again
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