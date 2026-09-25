
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
                action: () => { AppWindows.Singletons.SettingsEditor.open(); }
            },
            {
                label: "Save Windows state test",
                action: () => { AppWindows.saveAppWindowsState(); }
            }
        ]
    }, 
    {
        label: "Tools",
        items: [
            {
                label: "New Assembly Editor",
                action: () => { AssemblyEditor.CreateNewWindowAndOpen(); }
            },
            {
                label: "New IRAM View",
                action: () => { IRAM_View.CreateNew_AndOpen(); }
            },
            {
                label: "New XRAM View",
                action: () => { XRAM_View.CreateNew_AndOpen(); }
            },
            {
                label: "New AM29F040_FLASH View",
                action: () => { AM29F040_FLASH_View.CreateNew_AndOpen(); }
            },
            {
                label: "Profiler",
                action: () => {  AppWindows.Singletons.Profiler.open(); }
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
    },
    {
        label: "Dev tests",
        items: [
            {
                label: "Fill almost all of AM29F040 settings sector",
                action: () => { cpu.bus.flash.mem.fill(0, 0x166C, 0x2FF0); }
            },
        ]
    }
];

function init_main_menu() {
    createMenu(document.getElementById("main-menu"), window.app.main_menu);
}

