class AssemblyEditor {

    #editor_menu = [
        {
            label: "File",
            items: [
                {
                    label: "Save",
                    comment: "Save current file",
                    action: () => this.saveCurrent()
                },
                {
                    label: "Save All",
                    comment: "Save all edited files",
                    action: () => this.saveAll()
                },
                {
                    label: "New file",
                    action: () => this.createNewFile()
                },
                {
                    label: "Open",
                    comment: "not implemented yet",
                    action: () => { notImplementedMessageDialog(); } 

                },
            ]
        }, 
    ];

    #buttonBar = [
        {
            text: "Save",
            onClick: () => {this.saveCurrent();}
        },
        {
            text: "Save All",
            onClick: () => {this.saveAll();}
        },
        {
            text: "Build Current",
            onClick: () => { this.buildCurrent(); }
        },
        {
            text: "Build All",
            onClick: () => { this.buildAll(); }
        },
    ];

    constructor({onBuild = (asmList) => {}}={}) {
        this.modal = new AceEditorModal({title:"Assembly Editor", height:700, width:500, resizable: true, aceTheme:"textmate", aceMode:"assembly_8051"});
        // extract commonly used objects
        this.ace_editor = this.modal.ace_editor;
        this.ace_editor_el = this.modal.ace_editor_el;
        this.onBuild = onBuild;

        this.ace_editor.commands.addCommand({
            name: "save",
            bindKey: { win: "Ctrl-S", mac: "Command-S" },
            exec: () => this.saveCurrent()
        });

        this.ace_editor.commands.addCommand({
            name: "build",
            bindKey: { win: "Ctrl-Shift-C", mac: "Command-Shift-C" },
            exec: () => this.buildCurrent()
        });

        this.modal.header_el.style.paddingBottom = '0px';

        let toolbar_el = appendNewElement(this.modal.header_el, 'div', {styles:{width: '100%', display: 'flex', flexDirection: 'row', boxSizing: 'border-box', padding:'0px'}});
        
        let menu_el = appendNewElement(toolbar_el, 'div');
        createMenu(menu_el, this.#editor_menu);

        let buttons_el = createButtonBar(this.#buttonBar);
        buttons_el.style.marginLeft = 'auto';
        toolbar_el.appendChild(buttons_el);

        let tab_msgr_el = appendNewElement(this.modal.header_el, 'div', {styles:{marginTop:'8px'}});
        this.#initTabManager(tab_msgr_el);

        this.#loadFiles();

        // used to show assemble result
        this.hexNumberRenderer = new HexNumberRenderer();
        this.hexNumberRenderer.attach(this.modal.ace_editor);
    }

    #loadFiles() {
        let fileList = AppStorageFileSystem.list('', name => name.endsWith('.asm'));
        for (const name of fileList) {
            const edit = AssemblyEditFile.load(name);
            this.addFileToTabs(edit);
        }
    }

    #initTabManager(tab_msgr_el) {
        this.tm = new TabManager(tab_msgr_el, {
            addUntitledFormat: (id) => {
                return `untitled_${id}.asm`;
            }
        });

        this.sessions = new Map();

        this.tm.addEventListener('close',     e => {
            log("file closed: " + e.detail.tab.title);
            //console.log(e.detail.tab);
            this.getOrCreateSession(e.detail.tab)
        });
        this.tm.addEventListener('activate', e => {
            this.ace_editor_el.style.display = '';
            log("tm - activated: " + e.detail.tab.title);
            let editor = this.ace_editor;
            if (editor == undefined) { 
                log("WARNING - ACE editor was not init");
                return;
            }
            let session = this.getOrCreateSession(e.detail.tab);
            editor.setSession(session);
            editor.focus();
        });
        this.tm.addEventListener('lastclosed', e => {
            log("last closed: " + e.detail.tab.title);
            this.ace_editor_el.style.display = 'none';
        });
        this.tm.addEventListener('renamed', e => {
            log("renamed: " + e.detail.tab.title);
            
        });

        this.tm.addEventListener('remove', e => {
            log("deleted: " + e.detail.tab.title);
            const session = this.sessions.get(e.detail.id);
            if (session) {
                session.destroy();
                this.sessions.delete(e.detail.id);
            }
            e.detail.tab.data.removePermanent();
            delete e.detail.tab.data;
        });
    }

    openModal() {
        this.modal.open();
    }

    addFileToTabs(edit) {
        let tab = this.tm.add( { get title() {return edit.name;}, set title(newName) { edit.renameTo(newName);}, data: edit, activate: true });
        let session = this.getOrCreateSession(tab);
        //console.log(edit.metafile.content);
        this.setSessionData(session, edit.getMetaFileContents());
    }

    saveCurrent() {
        this.saveTabData(this.tm.currentTab());
    }
    saveAll() {
        for (let tab of this.tm.tabs.values()) {
            this.saveTabData(tab);
        }
    }
    saveTabData(tab) {
        if (!tab) {
            infoModal({title:"Error", message:"There is not any active tab!!"});
            return;
        }
        console.log(tab);
        if (tab.dirty === false) {
            log("skip non dirty file: " + tab.title);
            return;
        }
        log("saved file: " + tab.title);
        let session = this.getOrCreateSession(tab);
        //console.log(session.getValue());
        tab.data.setAsmFileContents(session.getValue());
        tab.data.setMetaFileContents(this.getSessionData(session));
        tab.data.save();
        this.tm.setDirty(tab.id, false);
    }

    createNewFile() {
        let fileName = `new${ this.tm.getNextId()}`;
        inputModal({title:"New Asm File",message:"Enter filename:", value:fileName, 
            onValidate: (name) => {
                if (name.endsWith('.asm') == false) { name += '.asm'; }
                if (AppStorageFileSystem.exists(name)) {
                    return "A file allready exists with the name: " + name;
                }
                return true;
            },
            onConfirm: (name) => {
                if (name.endsWith('.asm') == false) { name += '.asm'; }
                const edit = AssemblyEditFile.createNew(name);
                edit.save();
                this.addFileToTabs(edit);
                
            }
        });
    }

    getSessionData(session) {
        return {
            //selection: session.getSelection().getRange(),
            scrollLeft: session.getScrollLeft(),
            scrollTop: session.getScrollTop(),
            folds: session.getAllFolds().map(fold => ({
                start: fold.start,
                end: fold.end,
                placeholder: fold.placeholder
            })),
        };
    }
    setSessionData(session, data) {
        if (!data) {
            return;
        }
        const Range = ace.require("ace/range").Range;
        if (data.folds) {
            data.folds.forEach(fold => {
                try {
                    session.addFold(
                        fold.placeholder,
                        new Range(
                            fold.start.row,
                            fold.start.column,
                            fold.end.row,
                            fold.end.column
                        )
                    );
                } catch (e) {
                    // kan hända om dokumentet ändrats sedan folds sparades
                    console.warn("Kunde inte återskapa fold", fold, e);
                }
            });
        }

        if (data.scrollLeft !== undefined) {
            session.setScrollLeft(data.scrollLeft);
        }

        if (data.scrollTop !== undefined) {
            session.setScrollTop(data.scrollTop);
        }

    }

    modeFor(filename) {
        if (/\.(asm)$/.test(filename)) return 'ace/mode/assembly_8051';
        /*if (/\.(cpp|h|hpp)$/.test(filename)) return 'ace/mode/c_cpp';
        if (filename.endsWith('.ini')) return 'ace/mode/ini';
        if (filename.endsWith('.js'))  return 'ace/mode/javascript';*/
        return 'ace/mode/text';
    }

    getOrCreateSession(tab) {
        let session = this.sessions.get(tab.id);
        if (!session) {
            session = new ace.EditSession(tab.data?.getAsmFileContents() ?? '', this.modeFor(tab.title));
            session.on('change', () => {
                
                this.tm.setDirty(tab.id, session.getValue() !== tab.data.getAsmFileContents());
            });
            this.sessions.set(tab.id, session);
        }
        return session;
    }

    printCompileResult(asm) {
        let machineCode = "";

        for (let insn of asm.listing) {
            if (insn.outBytes.length != 0) {
                const rawBytesText = insn.outBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ').padEnd(8, ' ');
                machineCode += `${hex(insn.addr,4)} [ ${rawBytesText} ]\n`;
            } else {
                machineCode += '\n';
            }
        }
        console.log(machineCode);
    }
    
    buildFromSession(session) {
        const text = session.getValue();
        const asm = ASM51.assemble(text);
        session.machineCodeListing = asm.listing;
        this.onBuild(asm);
    }

    buildCurrent() {
        this.saveCurrent();
        let tab = this.tm.currentTab();
        let session = this.getOrCreateSession(tab);
        this.buildFromSession(session);
        this.hexNumberRenderer.update(null, this.ace_editor);
    }

    buildAll() {
        this.saveAll();

        for (let session of this.sessions.values()) {
            this.buildFromSession(session);
        }
        this.hexNumberRenderer.update(null, this.ace_editor);
    }

}

class HexNumberRenderer
{
    constructor() {
        
    }
    
    getText(session, row) {
        let gutterLineText = "";
        //console.log(session);
        if (session.machineCodeListing && session.machineCodeListing.length != 0) {
            let insn = session.machineCodeListing[row];
            if ( insn && insn.outBytes.length != 0) {
                const rawBytesText = insn.outBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ').padEnd(8, ' ');
                gutterLineText = `${hex(insn.addr,4,false)} [ ${rawBytesText} ]  `;
            } else {
                //gutterLineText = "".padStart(18);//.repeat(18);
            }
            gutterLineText = gutterLineText.padStart(19);
        }
        return gutterLineText + (row + 1).toString().padStart(session.doc.$lines.length.toString().length);
    }

    getWidth(session, lastLineNumber, config) {
        return Math.max(
            lastLineNumber.toString(16).length,
            (config.lastRow + 1).toString(16).length,
            2
        ) * config.characterWidth;
    }

    update(e, editor) {
        editor.renderer.$loop.schedule(editor.renderer.CHANGE_GUTTER);
    }
    attach(editor) {
        editor.renderer.$gutterLayer.$renderer = this;
        editor.on("changeSelection", this.update);
        this.update(null, editor);
    }
    detach(editor) {
        if (editor.renderer.$gutterLayer.$renderer == this)
            editor.renderer.$gutterLayer.$renderer = null;
        editor.off("changeSelection", this.update);
        this.update(null, editor);
    }
};