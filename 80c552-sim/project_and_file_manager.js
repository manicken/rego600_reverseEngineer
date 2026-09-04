
let fileInput;

function init_project_and_file_manager() {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
}

async function firmware_opened(file) {

    console.log("firmware_opened");

    const reader = new FileReader();

    reader.onloadend = async () => {
        setCODE_LoadProfile_ResetCpu(
            Array.from(new Uint8Array(reader.result))
        );

        log("Loaded raw firmware: " + file.name);
        render();
    };

    reader.readAsArrayBuffer(file);
}

async function dataFile_opened(file) {

    console.log("dataFile_opened");

    const reader = new FileReader();

    reader.onloadend = () => {
        const bytes = new Uint8Array(reader.result);

        cpu.bus.flash.loadImage(Array.from(bytes));

        log(
            "Loaded raw data: " +
            file.name +
            " (" +
            bytes.length +
            " bytes)"
        );

        render();
    };

    reader.readAsArrayBuffer(file);
}

async function genericFirmware_opened(file) {

    console.log("genericFirmware_opened");

    const reader = new FileReader();

    reader.onloadend = async () => {
        const bytes = decode_ihex(reader.result);

        setCODE_LoadProfile_ResetCpu(bytes);

        log("Loaded Intel HEX: " + file.name);
        render();
    };

    reader.readAsText(file);
}

function project_opened(file) {

}

function combined_opened(file) {

}

function fileOpened(e) {
    console.log("dataFile_opened");
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const name = file.name.toLowerCase();

    // Explicit file formats
    if (name.endsWith(".json")) {
        project_opened(file);
        return;
    }

    if (name.endsWith(".zip")) {
        combined_opened(file);
        return;
    }

    if (/\.(hex|ihx)$/.test(name)) {
        genericFirmware_opened(file);
        return;
    }

    // Raw binary files are identified by size
    switch (file.size) {
        case 65536:
            firmware_opened(file);
            return;

        case 524288:
            dataFile_opened(file);
            return;
    }

    log("Unknown file type: " + file.name +
        " (" + file.size + " bytes)");
}

function openFile(e) {
  fileInput.onchange = fileOpened;
  fileInput.click();
}

function openFirmware(e) {
  fileInput.onchange = firmware_opened;
  fileInput.click();
}
function openDataFile(e) {
  fileInput.onchange = dataFile_opened;
  fileInput.click();
}