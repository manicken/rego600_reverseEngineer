
function printCompileResult(asm) {
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

function compileAsm() {
  const text = window.assemblyEditor_modal.assemblyEditor_ace.getValue();
  const asm = ASM51.assemble(text); 
  machineCodeListing = asm.listing;
  //printCompileResult(asm);
  console.log(asm);
  hexNumberRenderer.update(null, window.assemblyEditor_modal.assemblyEditor_ace);
}

var machineCodeListing = [];

var hexNumberRenderer = {
    getText: function(session, row) {
        let gutterLineText = "";
        //console.log(session);
        if (machineCodeListing.length != 0) {
            let insn = machineCodeListing[row];
            if ( insn && insn.outBytes.length != 0) {
                const rawBytesText = insn.outBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ').padEnd(8, ' ');
                gutterLineText = `${hex(insn.addr,4,false)} [ ${rawBytesText} ]  `;
            } else {
                //gutterLineText = "".padStart(18);//.repeat(18);
            }
            gutterLineText = gutterLineText.padStart(19);
        }
        return gutterLineText + (row + 1).toString().padStart(session.doc.$lines.length.toString().length);
    },
    getWidth: function(session, lastLineNumber, config) {
        return Math.max(
            lastLineNumber.toString(16).length,
            (config.lastRow + 1).toString(16).length,
            2
        ) * config.characterWidth;
    },
    update: function(e, editor) {
        editor.renderer.$loop.schedule(editor.renderer.CHANGE_GUTTER);
    },
    attach: function(editor) {
        editor.renderer.$gutterLayer.$renderer = this;
        editor.on("changeSelection", this.update);
        this.update(null, editor);
    },
    detach: function(editor) {
        if (editor.renderer.$gutterLayer.$renderer == this)
            editor.renderer.$gutterLayer.$renderer = null;
        editor.off("changeSelection", this.update);
        this.update(null, editor);
    }
};

//let asmEditTheme = "gruvbox";
let asmEditTheme = "textmate";


function initAssembly_Form(modal_el) {
    let content_el = createNewElement('div', { styles: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding:'6px', boxSizing: 'border-box' } });

    let toolbar_el = createNewElement('div', { styles: { width: '100%', height: '32px', display: 'flex', flexDirection: 'row', boxSizing: 'border-box', padding:'4px' }})
    
    content_el.appendChild(toolbar_el);
    
    let ace_editor_el = createNewElement('div', { styles: { width: '100%', height: '100%', boxSizing: 'border-box' } });
    
    content_el.appendChild(ace_editor_el);

    modal_el.setBody(content_el);
    modal_el.ace_editor_el = ace_editor_el;
    modal_el.toolbar_el = toolbar_el;
}


function openAssembly_Form(modal_el, asmCode) {
    modal_el.open();

    if (!modal_el.assemblyEditor_ace) {
        modal_el.assemblyEditor_ace = ace.edit(modal_el.ace_editor_el);
        modal_el.assemblyEditor_ace.setTheme("ace/theme/" + asmEditTheme);
        modal_el.assemblyEditor_ace.session.setMode("ace/mode/assembly_8051");
        
    }

    // this allows to close and reopen the editor
    // without destroying the content
    if (asmCode != undefined) {
        modal_el.assemblyEditor_ace.setValue(asmCode, -1);
    }
}

/*
function setAssemblyMachineCode(text) {
    window.assemblyEditor_machineCode_ace.setValue(text, -1);
}
    */