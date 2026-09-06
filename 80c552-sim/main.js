
window.app = {}; // global object to store all instances

document.addEventListener("DOMContentLoaded", async () => {
    window.app.log = document.getElementById('log');

    /*for (let i=0; i< 20; i++) {
      log(i);
    }*/

    init_main_menu();
    await simulator_init();
    
    window.app.goto_label_modal = new Modal({title:"Goto Label", height:768, width:420, resizable: true});
    window.app.list_label_references_modal = new Modal({title:"Address References", height:768, width:420, resizable: true});
    window.app.settings_modal = new Modal({title:"Settings", height:768, width:420, resizable: true});
    
    init_assemblyViewer();
    init_assemblyEditor();
    initHexEditorForm();
    init_project_and_file_manager();

});

function log(msg) {
  const el = window.app.log;
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}
