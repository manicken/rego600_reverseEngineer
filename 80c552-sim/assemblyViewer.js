
function init_assemblyViewer() {
    window.assemblyViewer_modal = new Modal({title:"Assembly Viewer", height:600, width:400, resizable: true});
    initAssembly_Form(window.assemblyViewer_modal);
}