
class AssemblyViewer extends AceEditor {

    constructor() {
        super({title:"Assembly Viewer", type:AssemblyViewer.TYPE, singletonID:"asmView", height:600, width:400, aceTheme:"textmate", aceMode:"assembly_8051"});
    }

    open(code=null) {
        super.open();
        if (code!=null) {
            this.aceEditor.setValue(code);
        }
    }
}
