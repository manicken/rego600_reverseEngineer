
window.app = {}; // global object to store all instances

document.addEventListener("DOMContentLoaded", async () => {
    AppStorage.setPrefix('js51.80c552.');

    window.app.log = document.getElementById('log');

    /*for (let i=0; i< 20; i++) {
      log(i);
    }*/

    init_main_menu();
    await simulator_init();
    
    window.app.goto_label_modal = new Modal({title:"Goto Label", height:768, width:420, resizable: true});
    window.app.list_label_references_modal = new Modal({title:"Address References", height:768, width:420, resizable: true});
    window.app.settings_modal = new Modal({title:"Settings", height:768, width:420, resizable: true});
    
    window.app.asmView = new AssemblyViewer();
    window.app.asmEdit = new AssemblyEditor({onBuild:(asmList) => {
      
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
      
    }});

    window.app.profiler = new Profiler({cpu:window.app.cpu, onGotoAddress: (addr) => {
        gotoDisasmAddress(addr);
    }});

    initHexEditorForm();
    init_project_and_file_manager();

    console.log(AppStorageFileSystem.list(/*'', name => name.endsWith('.asm')*/));

});

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

function log(msg) {
  const el = window.app.log;
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}
