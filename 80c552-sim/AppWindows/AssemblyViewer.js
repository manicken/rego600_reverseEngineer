
class AssemblyViewer extends AceEditor {

    constructor() {
        super({title:"Assembly Viewer", singleton:true, aceTheme:"textmate", aceMode:"assembly_8051"});
    }

    open(code=null) {
        super.open();
        if (code!=null) {
            this.aceEditor.setValue(code);
        }
    }

}
