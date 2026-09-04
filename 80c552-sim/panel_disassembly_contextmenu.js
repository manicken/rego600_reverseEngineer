let disasmContextMenu_el = undefined;
let disasmLineContext = undefined;
let gotoTargetList = [];

let disasmContextMenu_items = {
    editLabel:{ className:"disasm-context-item", label:"Edit label", handler:editDisasmLabel, comment:"Edit the label of the current row, it automatically updates all references as well." },
    editComment: { className:"disasm-context-item", label:"Edit comment", handler:editDisasmComment, comment:"Edit the tooltip comment shown when hovering over the row." },
    editCodeSeparator: { className:"disasm-context-separator" },
    viewAsmCode: { className:"disasm-context-item", label:"View Assembly code", handler:viewAsmCode, comment:"Export selection as assembly code code in the assembly viewer." },
    editCode: { className:"disasm-context-item", label:"Edit code", handler:editCode, comment:"Edit raw code in the hex editor." },
    gotoTargetSeparator: { className:"disasm-context-separator" },
    gotoTarget: { className: "disasm-context-item", label:"Goto target", handler:gotoTarget, comment:"Goto the target. Use 'Goto back' to return to the previous address." },
    gotoBack: { className: "disasm-context-item", label:"Goto back", handler:gotoTarget_Back, comment:"Return to the address where Goto target was last used." },
    gotoSeparator: { className:"disasm-context-separator" },
    gotoLabel: { className: "disasm-context-item", label:"Goto any label", handler:gotoLabel, comment:"Goto any label from a list." },
    gotoAddress: { className: "disasm-context-item", label:"Goto address", handler:gotoAddress, comment:"Goto a user-selected address." },
    showAddressReferencesSeparator: { className:"disasm-context-separator" },
    showAddressReferences: { className: "disasm-context-item", label:"Show References to Address", handler:showAddressReferences, comment:"Show Call and Jump References to this address." },
    copySeparator: { className:"disasm-context-separator" },
    copyAssemblyInstructions: { className:"disasm-context-item", label: "Copy asm instructions", handler:copyAssemblyInstructions, comment:"Copy the decoded instruction assembly code including the labels." },
    copySelection: { className:"disasm-context-item", label:"Copy disassembly", handler:copyDisassembly, comment:"Copy the selected instruction(s) as formatted disassembly including the labels to the clipboard."},
    copyRawData:{ className:"disasm-context-item", label:"Copy raw data", handler:copyRawData, comment:"Copy the selected raw instruction bytes as hexadecimal." },
    copyAddress:{ className:"disasm-context-item", label:"Copy address", handler:copyAddress, comment:"Copy the selected instruction address(es) to the clipboard." },
    toggleBreakpointSeparator: { className:"disasm-context-separator" },
    toggleBreakpoint: { className:"disasm-context-item", label: "Toggle Breakpoint", handler:toggleDisasmBreakpoint, comment:"Toggle the breakpoint, can also be set/unset using the leftmost column."}
};

function initDisasmContextMenu() {
    disasmContextMenu_el = createNewElement("div", {
        className: "disasm-context-menu"
    });
    for (const [key, item] of Object.entries(disasmContextMenu_items)) {
        
        let new_el = createNewElement("div", {className:item.className});
        if (item.label != undefined) {
            new_el.textContent = item.label;
        }
        if (item.handler != undefined) {
            new_el.onclick = item.handler;
        }
        if (item.comment != undefined) {
            new_el.title = item.comment;
        }
        item.element = new_el;
        disasmContextMenu_el.appendChild( new_el );
    }
    console.log(disasmContextMenu_items);

    document.body.appendChild(disasmContextMenu_el);

    document.addEventListener("click", () => {
        hideDisasmContextMenu();
    });

    document.addEventListener("contextmenu", (event) => {
        if (!event.target.closest(".disassembly-grid-row")) {
            hideDisasmContextMenu();
        }
    });
}

function showDisasmContextMenu(event, disasmLine) {
    event.preventDefault();
    event.stopPropagation();

    disasmLineContext = disasmLine;
    //console.log(disasmLine.data);
    disasmContextMenu_items.gotoTargetSeparator.element.style.display = (disasmLine.data.target !== null) || (gotoTargetList.length != 0) ? "" : "none";
    disasmContextMenu_items.gotoTarget.element.style.display = (disasmLine.data.target !== null) ? "" : "none";
    disasmContextMenu_items.gotoBack.element.style.display = (gotoTargetList.length != 0) ? "" : "none";

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