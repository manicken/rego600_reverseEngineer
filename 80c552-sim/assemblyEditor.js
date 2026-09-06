window.app.assembly_editor_menu = [
    {
        label: "File",
        items: [
            {
                label: "Save",
                comment: "not implemented yet",
                action: () => { notImplementedMessageDialog(); }
            },
            {
                label: "New file",
                action: () => { 
                    let fileName = `untitled_${ window.assemblyEditor_modal.tm.getNextId()}`;
                    inputModal({title:"New Asm File",message:"Enter filename:", value:fileName, 
                        onValidate: (name) => {
                            if (name.endsWith('.asm') == false) { name += '.asm'; }
                            if (window.assemblyEditor_modal.tm.haveTabWithTitle(name)) {
                                return "A file allready exists with the name: " + name;
                            }
                            return true;
                        },
                        onConfirm: (name) => {
                            if (name.endsWith('.asm') == false) { name += '.asm'; }
                            window.assemblyEditor_modal.tm.add( { title:name, data: "", activate: true });
                        }
                    });
                    
                }
            },
            {
                label: "Open",
                comment: "not implemented yet",
                action: () => { notImplementedMessageDialog(); } 

            },
            
            
        ]
    }, 
];

function init_assemblyEditor() {
    

    window.assemblyEditor_modal = new Modal({title:"Assembly Editor", height:600, width:500, resizable: true});
    initAssembly_Form(window.assemblyEditor_modal);
   // window.assemblyEditor_modal.header_el.style.height = '64px';
    
    let menu_el = createNewElement('div');
    

    createMenu(menu_el, window.app.assembly_editor_menu);

    let buttons_el = createButtonBar([
        {
            text: "Save",
            onClick: () => {notImplementedMessageDialog();}
        },
        {
            text: "Compile",
            onClick: compileAsm
        },
    ]);
    buttons_el.style.marginLeft = 'auto';

    let toolbar_el = createNewElement('div', {styles:{width: '100%', display: 'flex', flexDirection: 'row', boxSizing: 'border-box', padding:'0px'}});
    toolbar_el.appendChild(menu_el);
    toolbar_el.appendChild(buttons_el);

    let tab_msgr_el = createNewElement('div', {styles:{marginTop:'8px'}});

    window.assemblyEditor_modal.header_el.style.paddingBottom = '0px';
    window.assemblyEditor_modal.header_el.appendChild(toolbar_el);
    window.assemblyEditor_modal.header_el.appendChild(tab_msgr_el);

    window.assemblyEditor_modal.tm = new TabManager(tab_msgr_el, {
        addUntitledFormat: (id) => {
            return `untitled_${id}.asm`;
        }
    });

    function saveSessionToJSON(session) {
        //const session = editor.getSession();
        
        const sessionData = {
            content: session.getValue(),
           // cursor: session.getCursorPosition(),
            selection: session.getSelection().getRange(),
            scrollLeft: session.getScrollLeft(),
            scrollTop: session.getScrollTop(),
            mode: session.getMode().$id,
            // Optional: Save code folds if your users use them
            folds: session.getAllFolds().map(fold => ({
                start: fold.start,
                end: fold.end,
                placeholder: fold.placeholder
            }))
        };

        return JSON.stringify(sessionData);
    }
    
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
    window.assemblyEditor_modal.tm.addEventListener('close',     e => {
        log("file closed: " + e.detail.tab.title);
        //console.log(e.detail.tab);
        getOrCreateSession(e.detail.tab)
    });
    window.assemblyEditor_modal.tm.addEventListener('activate', e => {
        window.assemblyEditor_modal.ace_editor_el.style.display = '';
        log("tm - activated: " + e.detail.tab.title);
        let editor = window.assemblyEditor_modal.assemblyEditor_ace;
        if (editor == undefined) { 
            log("WARNING - ACE editor was not init");
            return;
        }
        let session = getOrCreateSession(e.detail.tab);
        editor.setSession(session);
        editor.focus();

        console.log(session);
            console.log(saveSessionToJSON(session));
    });
    window.assemblyEditor_modal.tm.addEventListener('lastclosed', e => {
        log("last closed: " + e.detail.tab.title);
        window.assemblyEditor_modal.ace_editor_el.style.display = 'none';
    });
    window.assemblyEditor_modal.tm.addEventListener('renamed', e => {
        log("renamed: " + e.detail.tab.title);
        
    });

    window.assemblyEditor_modal.tm.addEventListener('remove', e => {
        log("tm - deleted: " + e.detail.tab.title);
        const session = sessions.get(e.detail.id);
        if (session) { session.destroy(); sessions.delete(e.detail.id); }
    });
    window.assemblyEditor_modal.tm.add( { data: "", activate: true });
    window.assemblyEditor_modal.tm.add( { data: "", activate: false });
    
}