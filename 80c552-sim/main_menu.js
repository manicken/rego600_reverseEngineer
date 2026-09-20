
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
            },
            {
                label: "Settings",
                action: () => { AppWindow.Singletons.settings.open(); }
            },
            {
                label: "Save Windows state test",
                action: () => { AppWindow.saveAppWindowsState(); }
            }
        ]
    }, 
    {
        label: "Tools",
        items: [
            {
                label: "Assembly Editor",
                action: () => { openNewAssemblyEditor(); }
            },
            {
                label: "Profiler",
                action: () => {  AppWindow.Singletons.profiler.open(); }
            },
            {
                label: "Code HexEditor",
                action: () => { editCode(); }
            },
            {
                label: "Goto Label",
                action: () => { gotoLabel(); }
            },
            
            
        ]
    }
];

function init_main_menu() {
    createMenu(document.getElementById("main-menu"), window.app.main_menu);
}

