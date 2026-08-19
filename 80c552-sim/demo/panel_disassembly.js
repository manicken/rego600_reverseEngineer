
/*
function printDissassembly_toElement() {
    // t.ex. externt avbrott 0 (irqn=0) -> 0x03, timer0 (irqn=1) -> 0x0B, osv
    let entry_points = [0x0000, 0x0003, 0x000B, 0x0013, 0x001B, 0x0023, 0x002B];
    let insn_map = js51_disasm.disassemble_recursive(cpu.CODE, entry_points, cpu.SFR);
    let addrs = [...insn_map.keys()].sort((a, b) => a - b)
    let text = "";
    for (const addr of addrs) {
        let insn = insn_map.get(addr)
        text += `${insn.addr.toString(16).padStart(4,'0')}  ${insn.bytes.map(b=>b.toString(16).padStart(2,'0').toUpperCase()).join(' ').padEnd(9)}  ${insn.text}`;
        text += "<br>";
    }
    document.getElementById("disassemblyView").innerHTML = text;
}
*/

let disasmContextMenu_el = undefined;
let disasmContextAddress = undefined;

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
        const address = disasmContextAddress;

        hideDisasmContextMenu();

        if (action === "label") {
            setDisasmLabel(address);
        }
        else if (action === "comment") {
            setDisasmComment(address);
        }
        else if (action === "copy-address") {
            navigator.clipboard.writeText(hex(address, 4));
        }
        else if (action === "copy-instruction") {
            copyDisasmInstruction(address);
        }
        else if (action === "breakpoint") {
            toggleDisasmBreakpoint(address);
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


function showDisasmContextMenu(event, address) {
    event.preventDefault();
    event.stopPropagation();

    disasmContextAddress = address;

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

//let disassemblyView_el = undefined;
let disasm_live_update = false;
let disasm_auto_scroll = false;

const disasmLines = new Array(0x10000);
let rowHeight = 20;
let disasmScroll_el;

function disassembly_toFlexGridElement() {
    initDisasmContextMenu();
    const disassemblyView_el = document.getElementById("disassemblyView");

    // Live tracking checkbox
    let liveTracking_ToolTip = "Enable live tracing while the simulator runs, stepping however always use Tracking";
    let live_tracking_chk_el = getCheckBoxWithLabel("Live Tracking", liveTracking_ToolTip);
    live_tracking_chk_el.input_el.onchange = () => {
        disasm_live_update = live_tracking_chk_el.input_el.checked;
    };
    live_tracking_chk_el.label_el.style.marginBottom = "10px";
    disassemblyView_el.appendChild( live_tracking_chk_el.label_el );

    let autoscroll_ToolTip = "Enable live tracing scrolling while the simulator runs, stepping however always use Tracking";
    let autoscroll_chk_el = getCheckBoxWithLabel("Live Scroll", autoscroll_ToolTip);
    autoscroll_chk_el.input_el.onchange = () => {
        disasm_auto_scroll = autoscroll_chk_el.input_el.checked;
    };
    autoscroll_chk_el.label_el.style.marginBottom = "10px";
    disassemblyView_el.appendChild( autoscroll_chk_el.label_el );

    let entry_points = [0x0000, 0x000B, 0x0023, 0x002B, 0x7863, 0x7841, 0x788F, 0x780C, 0x693D, 0x04D4, 0x0B36, 0x8218, 0x0B2E, 0x0B25, 0xEF2E, 0x694C, 0x6940, 0x692D, 0x6935, 0x6D26, 0x692F, 0xEF37, 0x04D0, 0x0B3B];

    let insn_map = js51_disasm.disassemble_recursive(cpu.CODE, entry_points, cpu.SFR);

    let addrs = [...insn_map.keys()].sort((a, b) => a - b);
    let container_el = createNewElement("div", { className: "disassembly-container" });

    disasmScroll_el = container_el;

    let grid_el = createNewElement("div", { className: "disassembly-grid" });

    container_el.appendChild(grid_el);

    // Header
    let header_el = createNewElement("div", { className: "disassembly-grid-row disassembly-grid-header" });

    appendNewElement(header_el, "div", { className: "disassembly-breakpoint", textContent: "" });
    appendNewElement(header_el, "div", { className: "disassembly-curr-exec", textContent: "" });
    appendNewElement(header_el, "div", { className: "disassembly-address", textContent: "Addr." });
    appendNewElement(header_el, "div", { className: "disassembly-bytes", textContent: "Bytes" });
    appendNewElement(header_el, "div", { className: "disassembly-mnemonic", textContent: "OP" });
    appendNewElement(header_el, "div", { className: "disassembly-operands", textContent: "Operands" });

    //grid_el.appendChild(header_el);
    disassemblyView_el.appendChild(header_el);

    // Instructions
    let lineIndex = 0;

    for (const addr of addrs) {
        const insn = insn_map.get(addr);

        const address = hex(insn.addr, 4, false);

        const bytes = insn.bytes.map(b => hex(b, 2, false)).join(' ');

        let row_el = createNewElement("div", { className: "disassembly-grid-row" });

        appendNewElement(row_el, "div", { className: "disassembly-breakpoint", textContent: "⬤" });

        let curr_exec_ptr_el = appendNewElement(row_el, "div", { className: "disassembly-curr-exec" });

        disasmLines[insn.addr] = {row_el, curr_exec_ptr_el, lineIndex };

        lineIndex++;

        appendNewElement(row_el, "div", { className: "disassembly-address", textContent: address });
        appendNewElement(row_el, "div", { className: "disassembly-bytes", textContent: bytes });
        appendNewElement(row_el, "div", { className: "disassembly-mnemonic", textContent: insn.mnemonic });
        appendNewElement(row_el, "div", { className: "disassembly-operands", textContent: insn.operands });

        grid_el.appendChild(row_el);

        row_el.addEventListener("contextmenu", (event) => {
            showDisasmContextMenu(event, insn.addr);
        });
    }

    disassemblyView_el.appendChild(container_el);

    rowHeight = disasmLines[0].curr_exec_ptr_el.offsetHeight;

    setCurrentExecLine(cpu, true);
}
let prevExecLine = undefined;
/*
function setCurrentExecLine(cpu, force = false) {
    if (!disasm_live_update && !force) return;

    const address = cpu.PC.get();
    

    if (prevExecLine != undefined) {
        prevExecLine.curr_exec_ptr_el.classList.remove("current-exec");
    }
    prevExecLine = disasmLines[address];
    if (prevExecLine) {
        
        prevExecLine.curr_exec_ptr_el.classList.add("current-exec");
        //const t1 = performance.now();
        prevExecLine.curr_exec_ptr_el.scrollIntoView({
            block: "center",
            behavior: "instant"
        });
        //const t2 = performance.now();

        
    } else {
        console.log("disasm not found addr: "+ hex(address,4));
    }
}*/

function setCurrentExecLine(cpu, force = false) {
    if (!disasm_live_update && !force)
        return;

    const address = cpu.PC.get();

    if (prevExecLine) {
        //prevExecLine.curr_exec_ptr_el.classList.remove("current-exec");
         prevExecLine.curr_exec_ptr_el.textContent = "";
    }
    const line = disasmLines[address];

    if (!line)
        return;

    prevExecLine = line;
    line.curr_exec_ptr_el.textContent = "▶";
    //prevExecLine.curr_exec_ptr_el.classList.add("current-exec");

    if (!disasm_auto_scroll)
        return;

    line.row_el.scrollIntoView({
            block: "center",
            behavior: "instant"
        });
/*
    const index = line.lineIndex;
//console.log(index, rowHeight);
    const target =
        index * rowHeight
        - (disasmScroll_el.clientHeight - rowHeight) / 2;
    
    disasmScroll_el.scrollTop = Math.max(0, target);*/
}