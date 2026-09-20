
window.app = {}; // global object to store all instances
window.app.windows = {}; // will be removed in future

/*window.addEventListener("beforeunload", (e) => {
  e.preventDefault();
  e.returnValue = true;
    
});*/
//console.log(new AppWindow() != undefined); // Skriver ut: function Window() { [native code] }

document.addEventListener("DOMContentLoaded", async () => {
    AppStorage.setPrefix('js51.80c552.');
    window.app.log = document.getElementById('log');
    AppWindowManager.init(document.getElementById("app-window-manager"));
    init_main_menu();
    await simulator_init();
    initSingletonAppWindows();
    init_project_and_file_manager();
    console.log(AppStorageFileSystem.list());
});



function log(msg) {
  const el = window.app.log;
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}
