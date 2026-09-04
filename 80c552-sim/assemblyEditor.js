
function init_assemblyEditor() {
    window.assemblyEditor_modal = new Modal({title:"Assembly Editor", height:600, width:500, resizable: true});
    initAssembly_Form(window.assemblyEditor_modal);
    window.assemblyEditor_modal.toolbar_el.style.height = '64px';
    window.assemblyEditor_modal.toolbar_el.style.flexDirection = 'column';
    window.assemblyEditor_modal.toolbar_el.appendChild(createButtonBar([
        {
            text: "Save",
            onClick: () => {infoModal({message:"This function is not yes implemented"});}
        },
        {
            text: "Compile",
            onClick: compileAsm
        },
    ]));

    let tab_msgr_el = appendNewElement(window.assemblyEditor_modal.toolbar_el, 'div');

    const tm = new TabManager(tab_msgr_el, {
        getIcon: (file) => {console.log(file); return '';} // e.g. return an icon per file type here
    });
    const files = {
        'main.cpp':   'void setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n}\n',
        'hal.h':      '#pragma once\n\nclass Hal {\npublic:\n  virtual void init() = 0;\n};\n',
        'platformio.ini': '[env:esp32dev]\nplatform = espressif32\nboard = esp32dev\n',
    };
    const sessions = new Map(); // tab.id -> ace.EditSession
    function ensureSession(tab) {
        let session = sessions.get(tab.id);
        if (!session) {
        session = new ace.EditSession(tab.data ?? '');
        session.on('change', () => {
            tm.setDirty(tab.id, !session.getUndoManager().isClean());
        });
        sessions.set(tab.id, session);
        }
        return session;
    }
    tm.addEventListener('open',     e => ensureSession(e.detail.tab));
    tm.addEventListener('activate', e => {
        let editor = window.assemblyEditor_modal.assemblyEditor_ace;
        if (editor == undefined) return;
        editor.setSession(ensureSession(e.detail.tab));
        editor.focus();
    });
    tm.addEventListener('remove', e => {
        const session = sessions.get(e.detail.id);
        if (session) { session.destroy(); sessions.delete(e.detail.id); }
    });
    tm.open('main.cpp', { title: 'main.cpp', data: files['main.cpp'] });
    tm.open('hal.h', { title: 'hal.h', data: files['hal.h'], activate: false });
}