function initWindows(items) {
    for (let i=0;i<items.length;i++) {
        decodeAndInitWindow(items[i]);
    }
}

const WindowTypes = {
    [GotoLabelForm.TYPE]: () =>  {
        new GotoLabelForm({
            onGotoAddress: gotoDisasmAddress,
            filters: [
                [js51_disasm.LabelType.User, "User"],
                [js51_disasm.LabelType.Func, "Functions"],
                [js51_disasm.LabelType.Jump, "Jumps"]
            ]
        }).onOpen = (win) => {
            win.generateList(insn_map);
        };
    },

    [LabelReferencesForm.TYPE]: () => {
        new LabelReferencesForm({
            onGotoAddress: gotoDisasmAddress
        })
    },

    [SettingsEditor.TYPE]: () => {
        new SettingsEditor()
    },

    [AssemblyViewer.TYPE]: () => {
        new AssemblyViewer()
    },

    [AssemblyEditor.TYPE]: () => {
        new AssemblyEditor({ onBuild: asmEditOnBuild });
    },

    [Profiler.TYPE]: () => {
        new Profiler({
            cpu: window.app.cpu,
            onGotoAddress: gotoDisasmAddress
        })
    },

    [HexEditor.TYPE]: () => {
        new HexEditor()
    }
};
function decodeAndInitWindow(win) {
    const factory = WindowTypes[win.type];

    if (!factory) {
        console.warn(`Unknown window type: ${win.type}`);
        return;
    }

    factory(win);
}

function initSingletonAppWindows() {
    let singletonsDefault = [
        {type:GotoLabelForm.TYPE},
        {type:LabelReferencesForm.TYPE},
        {type:SettingsEditor.TYPE},
        {type:AssemblyViewer.TYPE},
        {type:Profiler.TYPE},
        {type:HexEditor.TYPE},
    ];
    initWindows(singletonsDefault);
}

function openNewAssemblyEditor() {
    new AssemblyEditor({ onBuild: asmEditOnBuild }).open();
}

function asmEditOnBuild(asmList) {
    //printAsmList(asmList);

    for (let [addr, byte] of asmList.bytes) {
      //console.log(`${hex(addr,4)} [ ${hex(byte,2)} ]`);
      window.app.cpu.CODE[addr] = byte;
    }
    let code_map = replaceRemoveLabels(curr_firmware.code_map, asmList.listing)
    //console.log(code_map);
    completeRebuildDisassembly(code_map);
    rebuildDisasmDisplayList();
    renderVisibleDisasmRows();
}

function replaceRemoveLabels(code_map, asmList) {
    // First remove entries in code_map that
    // are now used by the new code.
    code_map = code_map.filter(entry => {
      return !asmList.some(item => {
            let itemStart = item.addr
            let itemEnd = itemStart + Math.max(item.outBytes.length, 1) - 1;
            //itemStart <= entry.start <= itemEnd
            return ( itemStart <= entry.start && entry.start <= itemEnd)
        }
      );
    });
    for (const item of asmList) {
        if (!item.rec.label)
            continue;

        code_map.push({
            start: item.addr,
            type: MAP_TYPE.FUNC,
            label: item.rec.label,
            comment: item.rec.comment
        });
    }
    return code_map;
}

function printAsmList(asmlist) {
  console.log(asmlist);
  console.log(JSON.stringify(asmlist.listing, null, 2));
  let dump = "";
  for (let item of asmlist.listing) {
    dump += `addr:${hex(item.addr,4)}, size:${item.outBytes.length}, label:"${item.rec.label??''}", comment:"${item.rec.comment??''}"\n`;
  }
  console.log(dump);
}