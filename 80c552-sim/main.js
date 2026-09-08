
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
    window.app.asmEdit = new AssemblyEditor();

    initHexEditorForm();
    init_project_and_file_manager();

    
    /*let file1 = AssemblyEdit.createNew('test1.asm', "ORG 0x0000\nORG_END 0x0FFF");
    file1.save();
    let file2 = AssemblyEdit.createNew('test2.asm', "ORG 0x1000\nORG_END 0x1FFF");
    file2.save();
*/
    console.log(AppStorageFileSystem.list(/*'', name => name.endsWith('.asm')*/));

});

function log(msg) {
  const el = window.app.log;
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}
