
class AssemblyViewer {

    constructor() {
        this.modal = new AceEditorModal({title:"Assembly Viewer", height:600, width:400, aceTheme:"textmate", aceMode:"assembly_8051"});
    }

    open(code) {
        this.modal.open();
        this.modal.ace_editor.setValue(code);
    }
}
