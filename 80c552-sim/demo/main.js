
let cpu = null;
let i2cBus = null;
let rtc = null;
let ext_wdt = null;

function log(msg) {
  const el = document.getElementById('log');
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}

let ADC_MAX_VALUE = 1023;
let ADC_MIN_VALUE = 0;

function binaryStateConvert(value) {
    return value ? ADC_MIN_VALUE : ADC_MAX_VALUE;
}
function invertedBinaryStateConvert(value) {
    return value ? ADC_MAX_VALUE : ADC_MIN_VALUE;
}
function rawValue(val) { return val; }
function rego600_reverse_Temp_to_ADC_val(temp) {
  let addressOffset = curr_firmware.adc_lookup_table_addr;
  let indexOffset = curr_firmware.adc_lookup_table_index_offset;
  let bestIndex = -1;
  let bestDiff = Infinity;

  temp *= 10;
  //console.log(`--- LUT search for ${temp} ---`);
  for (let index = 0; index < 1024; index++) {
    let addr = index * 2 + addressOffset;
    let val = (cpu.CODE[addr] << 8) | cpu.CODE[addr + 1];
    //console.log(`checking value: ${val} @ addr:${hex(addr,4)}`)
    let diff = Math.abs(val - temp);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
      if (diff === 0) break; // exact hit cannot be better
    }
  }
//console.log(     `BEST: index=${bestIndex} adc=${bestIndex + indexOffset} ` +    `diff=${bestDiff}`  );
  return bestIndex === -1 ? -1 : bestIndex + indexOffset;
}
let CD4051_mux_A_inputDefs = { 
  0:{name:"EXT",  value:false,   connected:false, note:"external control input (binary states only)", valTransferFunction:binaryStateConvert},
  1:{name:"GT5",  value:21.6,    connected:true, note:"Room", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  2:{name:"GT4",  value:0.0,     connected:false, note:"Radiator Forward", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  3:{name:"GT11", value:19.8,    connected:true, note:"Cold fluid out", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  4:{name:"GT3X", value:0.0,     connected:false, note:"external hot water", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  5:{name:"GT1",  value:20.9,    connected:true, note:"Radiator Return", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  6:{name:"GT2",  value:22.1,    connected:true, note:"Outdoor", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  7:{name:"LP",   value:false,   connected:true, note:"Low Pressure is High", valTransferFunction:invertedBinaryStateConvert}
};
let CD4051_mux_B_inputDefs = { 
  0:{name:"HP",     value:false, connected:true,  note:"High Pressure is High", valTransferFunction:invertedBinaryStateConvert},
  1:{name:"SP_ADC", value:0.0,   connected:false, note:"Service port ADC input", valTransferFunction:rawValue},
  2:{name:"GT10",   value:19.7,  connected:true,  note:"Cold fluid in", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  3:{name:"GT8",    value:21.7,  connected:true,  note:"Heat fluid out", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  4:{name:"GT6",    value:20.0,  connected:true,  note:"Compressor - high pressure side", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  5:{name:"GT3",    value:55.3,  connected:true,  note:"Hot water", valTransferFunction:rego600_reverse_Temp_to_ADC_val},
  6:{name:"VVP",    value:false, connected:false, note:"Pressure safety switch of unknown use", valTransferFunction:invertedBinaryStateConvert},
  7:{name:"GT9",    value:20.2,  connected:true,  note:"Heat fluid in", valTransferFunction:rego600_reverse_Temp_to_ADC_val}
};
function getValues(inputDefs)
{
    let values = [];

    for (let i = 0; i < 8; i++) {
        const input = inputDefs[i];
        
        if (!input || !input.connected) {
            values[i] = ADC_MAX_VALUE;
        } else {
          //console.log(`ADC input ${input.name}: value=${input.value}, connected=${input.connected}`);
            values[i] = input.valTransferFunction(input.value);
        }
    }

    return values;
}

function init_SignalInputs() {
    const div = document.getElementById('input_signals');

    let html = '';

    for (let ch = 0; ch < 16; ++ch) {
        const defs = ch < 8
            ? CD4051_mux_A_inputDefs
            : CD4051_mux_B_inputDefs;

        const input = defs[ch % 8];
        if (input === undefined) { continue; }

        html += `
        <div style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox"
                  ${input.connected ? 'checked' : ''}
                  onchange="setAdcChannelConnected(${ch}, this.checked)">

            <label style="width:50px;" title="${input.note}">
                ${input.name}
            </label>
        `
        if (typeof input.value != "boolean") {
            html += `
                <input title="${input.note}"
                    style="width:50px;"
                    type="number"
                    step="0.1"
                    min="-40"
                    max="140"
                    value="${input.value}"
                    ${!input.connected ? 'disabled' : ''}
                    style="width:70px"
                    onchange="setAdcChannel(${ch}, this.value)">
            
            `;
        }
        html += "</div>";
    }

    div.innerHTML = html;
}

function updateAdcChannel(ch) {
    const defs = ch < 8
        ? CD4051_mux_A_inputDefs
        : CD4051_mux_B_inputDefs;

    const index = ch % 8;
    const input = defs[index];

    const adcValue = input.connected
        ? input.valTransferFunction(input.value)
        : ADC_MAX_VALUE;

    if (ch < 8)
        CD4051_mux_A.X[index] = adcValue;
    else
        CD4051_mux_B.X[index] = adcValue;
}
function setAdcChannel(ch, value) {
    const defs = ch < 8
        ? CD4051_mux_A_inputDefs
        : CD4051_mux_B_inputDefs;

    const input = defs[ch % 8];

    input.value = parseFloat(value);
    updateAdcChannel(ch);
}
function setAdcChannelConnected(ch, connected) {
    const defs = ch < 8
        ? CD4051_mux_A_inputDefs
        : CD4051_mux_B_inputDefs;

    const input = defs[ch % 8];

    input.connected = connected;
    updateAdcChannel(ch);
    init_SignalInputs();
}

let CD4051_mux_A = undefined;
let CD4051_mux_B = undefined;
let CD4094_A = undefined;
let CD4094_B = undefined;

async function setCODE_LoadProfile_ResetCpu(codeData) {
    cpu.CODE = codeData;
    cpu.CODE_ORIGINAL = [...codeData];
    const hash = await sha256(codeData);
    const hashString = hex(hash, 32, false);
    //log("loaded firmware hash:" + hashString);
    //console.log("loaded firmware hash:" + hashString);
    setCurrentFirmwareProfile(hashString);
    cpu.reset();
    resetDisassembly();
}

async function initCpu() {
  i2cBus = new I2CBus();
	
  cpu = create_80c552({
    i2cBus:i2cBus
  });
  if (builtin_flashCodeData) {
	  await setCODE_LoadProfile_ResetCpu(builtin_flashCodeData);
  }
  if(builtin_flashData) {
	  cpu.bus.flash.loadImage(builtin_flashData);
  }

  ext_wdt = new TC1232({timeoutMs:1200});
  install_tc1232(cpu, ext_wdt, { st: pinNameToStruct("P4.1") });
  
  rtc = new DS1302();
  //const ds = traceDevice(new DS1302(), "DS1302");
  //rtc.setDateTime(); // set current time using system time
  rtc.useSystemTime = true;
  // this uses setInterval internally to handle the time update
  // if useSystemTime is true then each tick sets the time from the system clock
  // else it's completely simulated
  // when simulated it's possible to set the date/time from wichin the simulated system
  rtc.startClock(); 

	install_ds1302(cpu, rtc, {
	  ce:   pinNameToStruct("P4.1"),
	  sclk: pinNameToStruct("P1.3"),
	  io:   pinNameToStruct("P1.1"),
	});

	CD4094_A = new ShiftOut4094();
	install_4094(cpu, CD4094_A, {
	  data: pinNameToStruct("P1.4"),
	  clk:  pinNameToStruct("P1.3"),
	  str:  pinNameToStruct("P4.4"),
	}, "A");

  CD4094_B = new ShiftOut4094();
	install_4094(cpu, CD4094_B, {
	  data: {port:CD4094_A.QS1, bit:0},
	  clk:  pinNameToStruct("P1.3"),
	  str:  pinNameToStruct("P4.4"),
	}, "B");

  //console.log(getValues(CD4051_mux_A_inputDefs));
  CD4051_mux_A = new CD4051({
    A: {port:CD4094_B.outputs, bit:0},
    B: {port:CD4094_B.outputs, bit:1},
    C: {port:CD4094_B.outputs, bit:2},
    INH: {port:CD4094_B.outputs, bit:3},
  }, getValues(CD4051_mux_A_inputDefs), "A");


  const mux_B_Invert_INH = new Inverter({port:CD4094_B.outputs, bit:3});
  
  CD4051_mux_B = new CD4051({
    A: {port:CD4094_B.outputs, bit:0},
    B: {port:CD4094_B.outputs, bit:1},
    C: {port:CD4094_B.outputs, bit:2},
    INH: {port:mux_B_Invert_INH, bit:0},
  }, getValues(CD4051_mux_B_inputDefs), "B");

  // executes after every instruction so it's perfect to use for adc selection
  cpu.external_hw_ticks.push(() => {

    if (readPinLatch(CD4094_B.outputs, 3) === 0) {
      cpu.adc.setChannelValue(0, CD4051_mux_A.get());
    } else {
     // console.log("do this happend:" + mux_B_Invert_INH.get() + CD4051_mux_B.get());
      cpu.adc.setChannelValue(0, CD4051_mux_B.get());
    }
    
  });

	const shIn = new ShiftIn4021();
	install_4021(cpu, shIn, {
	  pl:  pinNameToStruct("P4.5"),
	  clk: pinNameToStruct("P4.7"),
	  q:   pinNameToStruct("P1.5"),
	});

  let threephasestatesBackwardDir = [
    0x50, //0b01010000
    0x40, //0b01000000
    0x60, //0b01100000
    0x20, //0b00100000
    0x30, //0b00110000
    0x10  //0b00010000
  ];
  let threephasestatesForwardDir = [
    0x10, //0b00010000
    0x30, //0b00110000
    0x20, //0b00100000
    0x60, //0b01100000
    0x40, //0b01000000
    0x50, //0b01010000
  ];
  let phaseTicks = 0;
  let phaseStep = 0;
  function getCurrentStepValue() {
    return threephasestatesForwardDir[phaseStep];
  }
  shIn.inputs = getCurrentStepValue() | 0x00;
  let three_phase_50hz_simulation_seq_ticks = 3072; // 11050000Hz / 12cpu_machine_cycles / 50Hz / 6steps = 3072 cpu machine cycles
  cpu.external_hw_ticks.push((cycles) => {
      phaseTicks+=cycles;

      if (phaseTicks >= three_phase_50hz_simulation_seq_ticks) {
          phaseTicks -= three_phase_50hz_simulation_seq_ticks;

          phaseStep++;
          if (phaseStep >= 6) {
              phaseStep = 0;
          }

          shIn.inputs = getCurrentStepValue() | 0x00;
      }
  });

  cpu.PSW.setlistener.push((oldval, newval) => {
	  let oldBank = oldval & 0x18;
    let newBank = newval & 0x18;
	  if (oldBank !== newBank) {
        console.log(
            "PSW Bank switch at PC=" + hex(cpu.PC.get(), 4) +
            " : " +
            hex(oldBank) +
            " -> " +
            hex(newBank)
        );
    }
  });

  install_uart(cpu);

  set_uart_handler();

  log('80C552 instance created (32KB SRAM / 512KB AM29F040 flash on P4-selected external bus).');
  console.log(cpu);
}
function getCoreRegs() {
  return [
      ['PC', hex(cpu.PC.get(), 4)],
      ['SP', hex(cpu.SP.get())],
      ['DPTR', hex(cpu.DPTR.get(), 4)],
      ['A', hex(cpu.A.get())],
      ['B', hex(cpu.B.get())],
      ['R0', hex(cpu.R0.get())],
      ['R1', hex(cpu.R1.get())],
      ['R2', hex(cpu.R2.get())],
      ['R3', hex(cpu.R3.get())],
      ['R4', hex(cpu.R4.get())],
      ['R5', hex(cpu.R5.get())],
      ['R6', hex(cpu.R6.get())],
      ['R7', hex(cpu.R7.get())],
      ['PSW', hex(cpu.PSW.get())],
      ['error', cpu.error_info.code + (cpu.error_info.code ? ' @' + hex(cpu.error_info.addr,4) : '')],
  ];
}

function getPeripheralRegs() {
  return [
      ['IEN0', hex(cpu.IEN0.get())],
      ['IEN1', hex(cpu.IEN1.get())],
      ['ADCH', hex(cpu.ADCH.get())],
      ['ADCON', hex(cpu.ADCON.get())],
      ['S0CON', hex(cpu.S0CON.get())],
      ['S0BUF', hex(cpu.S0BUF.get())],
      ['S1STA', hex(cpu.S1STA.get())],
      ['S1CON', hex(cpu.S1CON.get())],
      ['TCON', hex(cpu.TCON.get())],
      ['TMOD', hex(cpu.TMOD.get())],
      ['TH0', hex(cpu.TH0.get())],
      ['TL0', hex(cpu.TL0.get())],
      ['P0', hex(cpu.P0.get())],
      ['P1', hex(cpu.P1.get())],
      ['P2', hex(cpu.P2.get())],
      ['P3', hex(cpu.P3.get())],
      ['P4', hex(cpu.P4.get())],
      ['P5', hex(cpu.P5.get())],
  ];
}

function getPowerOutputSignals() {
  return [
    ['SV1 CLOSE', readPinLatch(CD4094_A.outputs,0)?'on':'off'],
    ['SV1 OPEN', readPinLatch(CD4094_A.outputs,1)?'on':'off'],
    ['P1', readPinLatch(CD4094_A.outputs,3)?'on':'off'],
    ['P2', readPinLatch(CD4094_A.outputs,5)?'on':'off'],
    ['P3', readPinLatch(CD4094_A.outputs,7)?'on':'off'],
    ['COMP', readPinLatch(CD4094_A.outputs,6)?'on':'off'],
    ['VXV', readPinLatch(CD4094_A.outputs,4)?'on':'off'],
    ['EL3', readPinLatch(CD4094_A.outputs,2)?'on':'off'],
    ['EL6', readPinLatch(CD4094_B.outputs,5)?'on':'off'],
    ['SUM_LARM', readPinLatch(CD4094_B.outputs,4)?'on':'off'],
    ['LARM_LED', readPinLatch(CD4094_B.outputs,6)?'off':'on'],
  ];
}



function render(stepMode = false) {
  renderKeyValueTable(coreRegs_el, getCoreRegs());
  renderKeyValueTable(peripheralRegs_el, getPeripheralRegs());

  renderKeyValueTable(pwr_output_signals_el, getPowerOutputSignals());

  renderMemDumps();
  render_LCD();
  //renderBus();

  setCurrentExecLine(cpu, stepMode);

}

function addBreakpoint() {
    const addr = parseNumber(document.getElementById('bp_addr').value);

    if (Number.isNaN(addr))
        return;

    cpu.set_addr_break(addr);

    log("Breakpoint added at " + hex(addr,4));

    //renderBreakpoints();
}

function removeBreakpoint() {
    const addr = parseInt(document.getElementById('bp_addr').value);

    if (Number.isNaN(addr))
        return;

    cpu.remove_addr_break(addr);

    log("Breakpoint removed at " + hex(addr,4));

    //renderBreakpoints();
}

function clearBreakpoints() {
    cpu.addr_breakpoint = [];

    log("All breakpoints cleared");

    //renderBreakpoints();
}

let coreRegs_el;
let peripheralRegs_el;
let pwr_output_signals_el;
let fileInput;

async function printHashAsync(bytes) {
  const hash = await sha256(bytes);
  const hashString = hex(hash, 32, false);
  console.log("file save hash:" + hashString);
  log("file save hash:" + hashString);
}

document.addEventListener("DOMContentLoaded", async () => {
    coreRegs_el = document.getElementById('coreRegs');
    peripheralRegs_el = document.getElementById('peripheralRegs');
    pwr_output_signals_el = document.getElementById('pwr_output_signals');

    createMenu(document.getElementById("main-menu"), menu);

    await initCpu();
   // cpu.set_addr_break(0x8a9e); // uart read sysreg cmd 02
   // cpu.set_addr_break(0x8b87); // uart get ver cmd 7f

    init_memory_panels();

    init_service_interface_panel("service_interface");
    init_front_panel("front-panel");

    document.getElementById('btn_reset').onclick = () => { 
      cpu.reset();
      cpu.IRAM_USE_MAP = [];
      log('reset');
      render(true);
    };
    document.getElementById('btn_step').onclick = () => { cpu.next(1); render(true); };
    document.getElementById('btn_step100').onclick = () => { cpu.next(100); render(true); };
    document.getElementById('btn_step1000').onclick = () => { cpu.next(1000); render(true); };
    document.getElementById('btn_run').onclick = () => {
        if (cpu.running) return;
        cpu.running = true;
        document.getElementById('run_status').textContent = 'running...';
        init_SignalInputs();
        ext_wdt.startMonitoring();
        cpu.gui_render_handler = render;
        cpu.start_emulator_loop();
        return;
        
    };
    document.getElementById('btn_stop').onclick = stopRun;
    function stopRun() {
        cpu.running = false;
        ext_wdt.stopMonitoring();
        document.getElementById('run_status').textContent = '';
    }

    document.getElementById('btn_print_callstack').onclick = () => {
        console.log(cpu.getCallStackString());
    };
    disassembly_init();
    render();
    init_SignalInputs();

    window.hex_edit_modal = new Modal({title:"CODE-mem Hex Editor", height:768, width:695, resizable: true});
    window.goto_label_modal = new Modal({title:"Goto Label", height:768, width:420, resizable: true});
    window.list_label_references_modal = new Modal({title:"Address References", height:768, width:420, resizable: true});
    window.settings_modal = new Modal({title:"Settings", height:768, width:420, resizable: true});
    window.assemblyViewer_modal = new Modal({title:"Assembly Viewer", height:600, width:400, resizable: true});
    initAssemblyEditor(window.assemblyViewer_modal);

    window.assemblyEditor_modal = new Modal({title:"Assembly Editor", height:600, width:500, resizable: true});
    initAssemblyEditor(window.assemblyEditor_modal);
    appendButton(window.assemblyEditor_modal.toolbar_el, "Compile").onclick = compileAsm;
    
    initHexEditorForm();

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
   // fileInput.addEventListener('change', _onFileChange);
    initProfiling();
});

function initHexEditorForm() {
    const hex_editor_root_el = createNewElement("div", {id:"hex-editor", styles:{width:'100%', height:'100%'}});

    window.hex_edit_modal.setBody(hex_editor_root_el);
    window.hex_edit_modal.mount();
   // window.hex_edit_modal.open();

    const editor = new ModalHexEditor(hex_editor_root_el, {
      size: 0x10000,
      height: '100%',
      width: '100%',
      bytesPerRow: 16,
      mode:ModalHexEditor.Modes.Insert,
      onChange: (addr, value) => { 
        console.log(`@ ${hex(addr,4)} changed to ${hex(value,2)}`); 
        cpu.CODE[addr] = value;

        for (let i = 0; i < cpu.CODE.length; i++) {
          if (cpu.CODE[i] != cpu.CODE_ORIGINAL[i]) {
              console.log(
                  `0x${i.toString(16).padStart(4, "0").toUpperCase()}: ` +
                  `${cpu.CODE_ORIGINAL[i].toString(16).padStart(2, "0").toUpperCase()} -> ` +
                  `${cpu.CODE[i].toString(16).padStart(2, "0").toUpperCase()}`
              );

          }
        }
      },
      onSave: (bytes) => { 
        console.log('onSave fired,', bytes.length, 'bytes');
        printHashAsync(bytes);
      },
      onLoad: (bytes, info) => { 
        setCODE_LoadProfile_ResetCpu(Array.from(bytes))
        let logText = `hex editor loaded binary - fileName: ${info.fileName}, size: ${bytes.length} bytes`;
        console.log(logText);
        log(logText);
      }
    });

    // Example annotations from the REGO600 reverse-engineering notes —
    // remove or replace these once wired to real analysis data.
    editor.addBookmark(0x1EFC, 'standby / root menu record');
    editor.highlightRange(0x1EFC, 0x1EFC + 31, 'menu record (32B struct)');

    window.hexEditor = editor;
    editor.viewport.focus();
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


function initAssemblyEditor(modal_el) {
    let content_el = createNewElement('div', { styles: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding:'6px', boxSizing: 'border-box' } });

    let toolbar_el = createNewElement('div', { styles: { width: '100%', height: '32px', display: 'flex', flexDirection: 'row', boxSizing: 'border-box', padding:'4px' }})
    
    content_el.appendChild(toolbar_el);
    
    let ace_editor_el = createNewElement('div', { styles: { width: '100%', height: '100%', boxSizing: 'border-box' } });
    
    content_el.appendChild(ace_editor_el);

    modal_el.setBody(content_el);
    modal_el.mount();
    modal_el.ace_editor_el = ace_editor_el;
    modal_el.toolbar_el = toolbar_el;
}


function openAssemblyEditor(modal_el, asmCode) {
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

const menu = [
    {
        label: "File",
        items: [

            {
                label: "New Project",
                action: () => { console.log("new project stub");}
            },
            {
                label: "Open",
                comment: "File type is detected automatically:\n" +
                        "JSON → project data\n" +
                        "ZIP → project/combined archive\n" +
                        "HEX → generic firmware image\n" +
                        "65536 bytes → 27SF512 firmware\n" +
                        "524288 bytes → AM29F040 data",
                action: openFile  

            },
            
            {
                label: "Save Project [not implemented yet]",
                action: () => { console.log("save project stub");}
            }
        ]
    }, 
    {
        label: "Window",
        items: [
            {
                label: "Code HexEditor",
                action: () => { editCode() }
            },
            {
                label: "Goto Label",
                action: () => { gotoLabel(); }
            },
            {
                label: "Settings",
                action: () => { openSettings(); }
            },
            {
                label: "Assembly Editor",
                action: () => { 
                    openAssemblyEditor(window.assemblyEditor_modal);
                    hexNumberRenderer.attach(window.assemblyEditor_modal.assemblyEditor_ace);
                 }
            },
        ]
    }
];