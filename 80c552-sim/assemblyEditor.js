
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
        addUntitledFormat: (id) => {
            return `untitled_${id}.asm`;
        }
    });
    
    const sessions = new Map();
    function getOrCreateSession(tab) {
        let session = sessions.get(tab.id);
        if (!session) {
            session = new ace.EditSession(tab.data ?? '');
            session.on('change', () => {
                //tm.setDirty(tab.id, !session.getUndoManager().isClean());
            });
            sessions.set(tab.id, session);
        }
        return session;
    }
    /*tm.addEventListener('open',     e => {
        window.assemblyEditor_modal.ace_editor_el.style.display = '';
        log("file opened: " + e.detail.tab.title);
        getOrCreateSession(e.detail.tab);
    });*/
    tm.addEventListener('close',     e => {
        log("file closed: " + e.detail.tab.title);
        //console.log(e.detail.tab);
        getOrCreateSession(e.detail.tab)
    });
    tm.addEventListener('activate', e => {
        window.assemblyEditor_modal.ace_editor_el.style.display = '';
        log("tm - activated: " + e.detail.tab.title);
        let editor = window.assemblyEditor_modal.assemblyEditor_ace;
        if (editor == undefined) { 
            log("WARNING - ACE editor was not init");
            return;
        }
        editor.setSession(getOrCreateSession(e.detail.tab));
        editor.focus();
    });
    tm.addEventListener('lastclosed', e => {
        log("last closed: " + e.detail.tab.title);
        window.assemblyEditor_modal.ace_editor_el.style.display = 'none';
    });
    tm.addEventListener('renamed', e => {
        log("renamed: " + e.detail.tab.title);
        
    });

    tm.addEventListener('remove', e => {
        log("tm - deleted: " + e.detail.tab.title);
        const session = sessions.get(e.detail.id);
        if (session) { session.destroy(); sessions.delete(e.detail.id); }
    });
    tm.add( { data: "", activate: true });
    tm.add( { data: "", activate: false });

}