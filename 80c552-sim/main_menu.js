
window.app.main_menu = [
    {
        label: "File",
        items: [

            {
                label: "New Project",
                action: () => { console.log("new project stub");}
            },
            {
                label: "Open",
                comment: "File type is detected automatically:\n" +
                        "JSON → project data\n" +
                        "ZIP → project/combined archive\n" +
                        "HEX → generic firmware image\n" +
                        "65536 bytes → 27SF512 firmware\n" +
                        "524288 bytes → AM29F040 data",
                action: openFile  

            },
            
            {
                label: "Save Project [not implemented yet]",
                action: () => { console.log("save project stub");}
            }
        ]
    }, 
    {
        label: "Window",
        items: [
            {
                label: "Code HexEditor",
                action: () => { editCode() }
            },
            {
                label: "Goto Label",
                action: () => { gotoLabel(); }
            },
            {
                label: "Settings",
                action: () => { openSettings(); }
            },
            {
                label: "Assembly Editor",
                action: () => { 
                    openAssembly_Form(window.assemblyEditor_modal);
                    hexNumberRenderer.attach(window.assemblyEditor_modal.assemblyEditor_ace);
                 }
            },
        ]
    }
];

function init_main_menu() {
    createMenu(document.getElementById("main-menu"), window.app.main_menu);
}

