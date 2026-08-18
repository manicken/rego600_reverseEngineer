let cpu = null;
let i2cBus = null;
let running = false;
let runHandle = null;
let wd = null;

function log(msg) {
  const el = document.getElementById('log');
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
}

/*
let VREF_VOLTAGE = 5.12;
let VOLTAGE_NC = VREF_VOLTAGE;
let VOLTAGE_AT_25_degree = VREF_VOLTAGE/2;
let VOLTAGE_PRESSURE_NOT_ACTIVATED = 0;
let CD4051_mux_A_inputDefs = { 
  0:{name:"EXT",  defaultVoltage:VOLTAGE_NC, note:"external control input (binary states only)"},
  1:{name:"GT5",  defaultVoltage:VOLTAGE_AT_25_degree, note:"Room"},
  2:{name:"GT4",  defaultVoltage:VOLTAGE_NC, note:"Radiator Forward"},
  3:{name:"GT11", defaultVoltage:VOLTAGE_AT_25_degree, note:"Cold fluid out"},
  4:{name:"GT3X", defaultVoltage:VOLTAGE_NC, note:"external hot water"},
  5:{name:"GT1",  defaultVoltage:VOLTAGE_AT_25_degree, note:"Radiator Return"},
  6:{name:"GT2",  defaultVoltage:VOLTAGE_AT_25_degree, note:"Outdoor"},
  7:{name:"LP",   defaultVoltage:VOLTAGE_PRESSURE_NOT_ACTIVATED, note:"Low Pressure is High"}
};
let CD4051_mux_B_inputDefs = { 
  0:{name:"HP",     defaultVoltage:VOLTAGE_PRESSURE_NOT_ACTIVATED, note:"High Pressure is High"},
  1:{name:"SP_ADC", defaultVoltage:VOLTAGE_NC, note:"Service port ADC input"},
  2:{name:"GT10",   defaultVoltage:VOLTAGE_AT_25_degree, note:"Cold fluid in"},
  3:{name:"GT8",    defaultVoltage:VOLTAGE_AT_25_degree, note:"Heat fluid out"},
  4:{name:"GT6",    defaultVoltage:VOLTAGE_AT_25_degree, note:"Compressor/High pressure"},
  5:{name:"GT3",    defaultVoltage:VOLTAGE_AT_25_degree, note:"Hot water"},
  6:{name:"VVP",    defaultVoltage:VOLTAGE_NC, note:"???"},
  7:{name:"GT9",    defaultVoltage:VOLTAGE_AT_25_degree, note:"Heat fluid in"}
};
function getVoltages(inputDefs)
{
  let voltages = [];
  for (let i=0;i<8;i++) {
    voltages[i] = inputDefs[i].defaultVoltage;
  }
  return voltages;
}*/

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
  let addressOffset = 0xF7C6;
  let indexOffset = 9;
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

function renderSignalInputs() {
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

function renderPowerOutputs() {
  renderRegs(getPowerOutputSignals(), 'pwr_output_signals');
    
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
    renderSignalInputs();
}

let CD4051_mux_A = undefined;
let CD4051_mux_B = undefined;
let CD4094_A = undefined;
let CD4094_B = undefined;

function initCpu() {
  i2cBus = new I2CBus();
	
  cpu = create_80c552({
    i2cBus:i2cBus
  });
  if (builtin_flashCodeData) {
	cpu.CODE = builtin_flashCodeData;
  }
  if(builtin_flashData) {
	cpu.bus.flash.loadImage(builtin_flashData);
  }

  wd = new TC1232({timeoutMs:1200});
  install_tc1232(cpu, wd, { st: pinNameToStruct("P4.1") });
  
  const ds = new DS1302();
  //const ds = traceDevice(new DS1302(), "DS1302");
  ds.setDateTime(); // set current time using system time
  ds.startClock();  // tickar en gång per sekund på riktig väggklocka,
                    // oberoende av CPU:ns exekveringsloop — precis som
                    // den riktiga kretsens egna kristall

	install_ds1302(cpu, ds, {
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
	
  
  
  cpu.reset();

  //setInterval(() => console.log('ds phase:', ds._phase), 500);
  
  cpu.PSW.setlistener.push((oldval, newval) => {
	  let oldBank = oldval & 0x18;
    let newBank = newval & 0x18;
	  if (oldBank !== newBank) {
        console.log(
            "PSW Bank switch at PC=" + hex(cpu.PC.value) +
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
      ['R0', hex(cpu.IRAM[0])],
      ['R1', hex(cpu.IRAM[1])],
      ['R2', hex(cpu.IRAM[2])],
      ['R3', hex(cpu.IRAM[3])],
      ['R4', hex(cpu.IRAM[4])],
      ['R5', hex(cpu.IRAM[5])],
      ['R6', hex(cpu.IRAM[6])],
      ['R7', hex(cpu.IRAM[7])],
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
    ['S1', readPinLatch(CD4094_A.outputs,0)?'on':'off'],
    ['S2', readPinLatch(CD4094_A.outputs,1)?'on':'off'],
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

function renderRegs(regs, regs_element_id) {
  let html = "";

  for (let i = 0; i < regs.length; i++) {
    html += `<tr>
      <td class="reg">${regs[i][0]}</td>
      <td class="val">${regs[i][1]}</td>
    </tr>`;
  }
  document.getElementById(regs_element_id).innerHTML = html;
}

function renderBus() {
    const div = document.getElementById('p4bits');
    let html = '';

    const p4 = cpu.P4._value;
    const p3 = cpu.P3._value;

    const pins = [ 
      { port: 'P4', bit: 0, name: 'FLASH CS#' },
      { port: 'P4', bit: 2, name: 'SRAM CS#' },
      { port: 'P3', bit: 3, name: 'FLASH A16' },
      { port: 'P3', bit: 5, name: 'FLASH A17' },
      { port: 'P3',  bit: 4, name: 'FLASH A18' }
    ];

    for (const pin of pins) {
        const value = pin.port === 'P4'
            ? ((p4 >> pin.bit) & 1)
            : ((p3 >> pin.bit) & 1);

        html += `
        <div class="pinbit">
            <button class="${value ? 'toggle-on' : ''}"
                    onclick="toggleBusPin('${pin.port}', ${pin.bit})">
                ${value}
            </button>
            ${pin.port}.${pin.bit} ${pin.name}
        </div>`;
    }

    div.innerHTML = html;


    const sel = cpu.bus.readSelect();

    let device = 'NONE';

    if (sel.flashCS)
        device = 'FLASH';
    else if (sel.sramCS)
        device = 'SRAM';

    document.getElementById('bank_state').textContent = device;

    document.getElementById('ext_state').textContent =
        hex(sel.ext, 1) +
        ' (A18:16=' +
        sel.ext.toString(2).padStart(3, '0') +
        ')';
}

function dummy_handler() {
  console.error("service port - dummy handler was called");
}
function write_confirm_handler()
{
  console.info("service port - write confirm");
}
let expectedRxStruct = {cmd:-1, len:-1, handler:dummy_handler};
let currentRxCount = 0;
let currentRxBuff = [];
function CalcCheckSum(buffer) {
    let chksum = 0;
    for (let i=2;i<buffer.length;i++)
        chksum ^= buffer[i];
    return chksum;
}

function cmd00_02_04_06_7F_handler() {
  let value = (currentRxBuff[1] << 14) |
              (currentRxBuff[2] << 7) |
              (currentRxBuff[3]);
  console.log("service port rx value: " + hex(value) + " " + value);
  console.log(cpu.getCallStackString());
}

function packNibbles(nibblebytes, offset) {
  let bytes = [];
  for (let i=offset;i<nibblebytes.length;i+=2) {
    bytes.push((nibblebytes[i] << 4) | nibblebytes[i+1])
  }
  return bytes;
}

function cmd_20_handler() {
  let text = "";
  let bytes = packNibbles(currentRxBuff, 1);
  for (let i=0;i<20;i++) {
    text += printPrintable(bytes[i]);
  }
  console.log("service port cmd 20 rx: >>>" + text + "<<<");
}

let error_codes = {
  '0':"Sensor radiator return (GT1)",
  '1':"Outdoor sensor (GT2)",
  '2':"Sensor hot water (GT3)",
  '3':"Mixing valve sensor (GT4)",
  '4':"Room sensor (GT5)",
  '5':"Sensor compressor (GT6)",
  '6':"Sensor heat transf. fluid out (GT8)",
  '7':"Sensor heat transf. fluid in (GT9)",
  '8':"Sensor cold transf. fluid in (GT10)",
  '9':"Sensor cold transf. fluid in (GT11)",
  '10':"Compresor circuit switch",
  '11':"Electrical cassette",
  '12':"HTF C=pump switch (MB2)",
  '13':"Low pressure switch (LP)",
  '14':"High pressure switch (HP)",
  '15':"High return HP (GT9)",
  '16':"HTF out max (GT8)",
  '17':"HTF in under limit (GT10)",
  '18':"HTF out under limit (GT11)",
  '19':"Compressor superhear (GT6)",
  '20':"3-phase incorrect order",
  '21':"Power failure",
  '22':"Varmetr. delta hoch",
}

function cmd_40_42_handler() {
  let text = "";
  let bytes = packNibbles(currentRxBuff, 1);
  for (let i=1;i<16;i++) {
    text += printPrintable(bytes[i], true);
  }
  console.log(cpu.pr)
  console.log("service port cmd 40_42 rx: >>>" + error_codes[bytes[0]] + " - " + text + "<<<");
}

const extectedRxCountVsCmd = [
  {cmd:0x00, len:5, handler:cmd00_02_04_06_7F_handler},
  {cmd:0x01, len:1, handler:write_confirm_handler},
  {cmd:0x02, len:5, handler:cmd00_02_04_06_7F_handler},
  {cmd:0x03, len:1, handler:write_confirm_handler},
  {cmd:0x04, len:5, handler:cmd00_02_04_06_7F_handler},
  {cmd:0x05, len:1, handler:write_confirm_handler},
  {cmd:0x06, len:5, handler:cmd00_02_04_06_7F_handler},
  {cmd:0x07, len:1, handler:write_confirm_handler},
  {cmd:0x20, len:42, handler:cmd_20_handler},
  {cmd:0x40, len:42, handler:cmd_40_42_handler},
  {cmd:0x42, len:42, handler:cmd_40_42_handler},
  {cmd:0x7F, len:5, handler:cmd00_02_04_06_7F_handler},
];
function getExpectedRxStruct(cmd) {
  for (let i=0;i<extectedRxCountVsCmd.length; i++) {
    if (extectedRxCountVsCmd[i].cmd == cmd) {
      return extectedRxCountVsCmd[i];
    }
  }
  return undefined; // not found
}

let lastSendCmd = 0;
function service_port_send(cmd, param1=0x00, param2=0x00) {
    let responseStruct = getExpectedRxStruct(cmd);
    if (responseStruct == undefined) {
      console.log("service_port_send - unknown cmd: " + cmd);
      expectedRxStruct = {cmd:-1, len:-1, handler:dummy_handler};
      return;
    }
    expectedRxStruct = responseStruct;
    lastSendCmd = cmd;
    const buffer = [
      0x81, 
      cmd,
      ((param1 >> 14) & 0x7F),
      ((param1 >> 7) & 0x7F),
      (param1 & 0x7F),
      ((param2 >> 14) & 0x7F),
      ((param2 >> 7) & 0x7F),
      (param2 & 0x7F)
    ];
    buffer.push(CalcCheckSum(buffer));

    console.log("Service Port Send: [" + getBytesInAsciiHex(buffer, ', ') + ']');
    currentRxCount = 0;
    currentRxBuff = [];
    cpu.uart.rxBytes(buffer);
}
function service_port_request_any(cmd_el_id, param1_el_id, param2_el_id) {
  let cmd = parseNumber(document.getElementById(cmd_el_id).value);
  let param1 = parseNumber(document.getElementById(param1_el_id).value);
  let param2 = parseNumber(document.getElementById(param2_el_id).value);
  service_port_send(cmd, param1, param2);
}

// on TX mean when the MCU sends data to the client
function uart_on_tx_handler(byte, ninthBit) {
  currentRxBuff[currentRxCount++] = byte;
  
  if (currentRxCount == expectedRxStruct.len) {
    console.log('service port raw answer: [' + getBytesInAsciiHex(currentRxBuff, ', ') + ']');
    expectedRxStruct.handler();
    
  }
}
function set_uart_handler() {
  cpu.uart.onTx(uart_on_tx_handler);
}

function toggleBusPin(port, bit) {
    if (port === 'P4') {
        const cur = cpu.P4._value;
        cpu.P4.set(cur ^ (1 << bit));
    }
    else if (port === 'P3') {
        const cur = cpu.P3._value;
        cpu.P3.set(cur ^ (1 << bit));
    }

    render();
}

function render_IRAM() {
  document.getElementById('iram_dump').textContent = getMemoryContentsDump({
    reader: index => cpu.IRAM[index],
    ascii: true,
    columns: 16,
    colheader: true,
    size: 256,
    offset: 0,
    addressWidth: 2
  });
}

function render_DATA_FLASH_window() {
  const sel = cpu.bus.readSelect();
  const base = (sel.ext << 20) & (cpu.bus.flash.size - 1);

  document.getElementById('flash_dump').textContent = getMemoryContentsDump({
    reader: index => cpu.bus.flash.read(index, false),
    ascii: true,
    columns: 20,
    colheader: true,
    size: 300,
    offset: base,
    addressWidth: 5
  });
}

function render_XRAM_windows() {
  render_XRAM_window('xram-view-index-A', 'xram-view-A');
  render_XRAM_window('xram-view-index-B', 'xram-view-B');
  render_XRAM_window('xram-view-index-C', 'xram-view-C');
}

function renderMemDumps() {
  render_IRAM();
  render_XRAM_windows();
  //render_DATA_FLASH_window();  
}

function render() {
  renderRegs(getCoreRegs(), 'coreRegs');
  renderRegs(getPeripheralRegs(), 'peripheralRegs');
  //renderBus();
  renderPowerOutputs();
  renderMemDumps();
  render_LCD();
}


function dumpHex(bytes, bytesPerLine = 32) {
	let dumpText = "";
    for (let i = 0; i < bytes.length; i += bytesPerLine) {
        let line = Array.from(bytes.slice(i, i + bytesPerLine))
            .map(b => "0x" + b.toString(16).toUpperCase().padStart(2, "0"))
            .join(", ");
		dumpText += line + ",\n";
        //console.log(line + ",");
    }
	console.log(dumpText);
}

function renderBreakpoints() {
    const list = cpu.addr_breakpoint || [];

    document.getElementById('bp_list').textContent =
        list.map(a => hex(a,4)).join(", ");
}


function addBreakpoint() {
    const addr = parseNumber(document.getElementById('bp_addr').value);

    if (Number.isNaN(addr))
        return;

    cpu.set_addr_break(addr);

    log("Breakpoint added at " + hex(addr,4));

    renderBreakpoints();
}

function removeBreakpoint() {
    const addr = parseInt(document.getElementById('bp_addr').value);

    if (Number.isNaN(addr))
        return;

    cpu.remove_addr_break(addr);

    log("Breakpoint removed at " + hex(addr,4));

    renderBreakpoints();
}

function clearBreakpoints() {
    cpu.addr_breakpoint = [];

    log("All breakpoints cleared");

    renderBreakpoints();
}



function set_XRAM_value(addr, value)
{
    //let addr = parseNumber(document.getElementById(addr_element_id).value);
    //let value = parseNumber(document.getElementById(value_element_id).value);

    if(isNaN(addr) || isNaN(value))
        return;

    if(addr < 0 || addr >= cpu.bus.sram.size)
        return;

    if(value < 0 || value > 0xFFFF)
        return;
    
    if (value <= 0xFF) {
      cpu.bus.sram.write(addr, value);
    } else {
      cpu.bus.sram.write(addr, (value & 0xFF00) >> 8);
      cpu.bus.sram.write(addr+1, (value & 0xFF));
    }
    render_XRAM_windows();
}

function set_IROM_value(addr_element_id, value_element_id)
{
    let addr = parseNumber(document.getElementById(addr_element_id).value);
    let value = parseNumber(document.getElementById(value_element_id).value);

    if(isNaN(addr) || isNaN(value))
        return;

    if(addr < 0 || addr >= cpu.CODE.size)
        return;

    if(value < 0 || value > 0xFFFF)
        return;
    
    if (value <= 0xFF) {
      cpu.CODE[addr] = value;
    } else {
      cpu.CODE[addr] = (value & 0xFF00) >> 8;
      cpu.CODE[addr+1] = (value & 0xFF);
    }
}

function printDissassembly_toConsole() {
    // t.ex. externt avbrott 0 (irqn=0) -> 0x03, timer0 (irqn=1) -> 0x0B, osv
    let entry_points = [0x0000/*, 0x0003*/, 0x000B/*, 0x0013, 0x001B*/, 0x0023, 0x002B];
    let insn_map = js51_disasm.disassemble_recursive(cpu.CODE, entry_points, cpu.SFR);
    let addrs = [...insn_map.keys()].sort((a, b) => a - b)
    for (const addr of addrs) {
        let insn = insn_map.get(addr)
        console.log(`${insn.addr.toString(16).padStart(4,'0')}  ${insn.bytes.map(b=>b.toString(16).padStart(2,'0').toUpperCase()).join(' ').padEnd(9)}  ${insn.text}`)
    }
}
/*
function printDissassembly_toElement() {
    // t.ex. externt avbrott 0 (irqn=0) -> 0x03, timer0 (irqn=1) -> 0x0B, osv
    let entry_points = [0x0000, 0x0003, 0x000B, 0x0013, 0x001B, 0x0023, 0x002B];
    let insn_map = js51_disasm.disassemble_recursive(cpu.CODE, entry_points, cpu.SFR);
    let addrs = [...insn_map.keys()].sort((a, b) => a - b)
    let text = "";
    for (const addr of addrs) {
        let insn = insn_map.get(addr)
        text += `${insn.addr.toString(16).padStart(4,'0')}  ${insn.bytes.map(b=>b.toString(16).padStart(2,'0').toUpperCase()).join(' ').padEnd(9)}  ${insn.text}`;
        text += "<br>";
    }
    document.getElementById("disassemblyView").innerHTML = text;
}
*/

function printDissassembly_toElement() {
    let entry_points = [
        0x0000,
        0x000B,
        0x0023,
        0x002B
    ];

    let insn_map = js51_disasm.disassemble_recursive(
        cpu.CODE,
        entry_points,
        cpu.SFR
    );

    let addrs = [...insn_map.keys()].sort((a, b) => a - b);

    let html = `
        <table class="disassembly-table">
            <thead>
                <tr>
                    <th>Address</th>
                    <th>Bytes</th>
                    <th>Instruction</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const addr of addrs) {
        const insn = insn_map.get(addr);

        const address = insn.addr
            .toString(16)
            .padStart(4, '0')
            .toUpperCase();

        const bytes = insn.bytes
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');

        html += `
            <tr data-address="${insn.addr}">
                <td class="disasm-address">${address}</td>
                <td class="disasm-bytes">${bytes}</td>
                <td class="disasm-instruction">${insn.text}</td>
            </tr>
        `;
    }

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("disassemblyView").innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {

    initCpu();

    init_xram_write("directWriteXRAM", 6, set_XRAM_value);
    init_xram_view("xram_view_A", "A", 10);
    init_xram_view("xram_view_B", "B", 22);
    init_xram_view("xram_view_C", "C", 27);
    init_service_interface_panel("service_interface");
    init_front_panel("front-panel");
    
    //document.getElementById('btn_add_bp').onclick = addBreakpoint;
    //document.getElementById('btn_remove_bp').onclick = removeBreakpoint;
    //document.getElementById('btn_clear_bp').onclick = clearBreakpoints;
    if (document.getElementById('fw_file')) {
        document.getElementById('fw_file').onchange = function () {
            const file = this.files[0];
            if (!file) return;
            const isHex = /\.(hex|ihx)$/i.test(file.name);
            const reader = new FileReader();
            if (isHex) {
                reader.onloadend = () => {
                cpu.CODE = decode_ihex(reader.result);
                cpu.reset();
                log('Loaded Intel HEX: ' + file.name);
                render();
                };
                reader.readAsText(file);
            } else {
                reader.onloadend = () => {
                const bytes = new Uint8Array(reader.result);
                cpu.CODE = Array.from(bytes);
                //dumpHex(cpu.CODE);
                //console.log(cpu.CODE.join(", "));
                cpu.reset();
                log('Loaded raw binary: ' + file.name + ' (' + bytes.length + ' bytes)');
                render();
                };
                reader.readAsArrayBuffer(file);
            }
        };
    }
    if (document.getElementById('data_flash_file')) {
        document.getElementById('data_flash_file').onchange = function () {
            const file = this.files[0];
            if (!file) return;
            const isHex = /\.(hex|ihx)$/i.test(file.name);
            const reader = new FileReader();
            if (isHex) {
                reader.onloadend = () => {
                    let myFirmwareBytes = decode_ihex(reader.result);
                cpu.bus.flash.loadImage(myFirmwareBytes);
                        log('Loaded Intel HEX: ' + file.name);
                render();
                };
                reader.readAsText(file);
            } else {
                reader.onloadend = () => {
                const bytes = new Uint8Array(reader.result);
                let myFirmwareBytes = Array.from(bytes);
                //dumpHex(myFirmwareBytes);
                //console.log(myFirmwareBytes.join(", "));
                cpu.bus.flash.loadImage(myFirmwareBytes);
                log('Loaded raw binary: ' + file.name + ' (' + bytes.length + ' bytes)');
                render();
                };
                reader.readAsArrayBuffer(file);
            }
        };
    }
    document.getElementById('cpu_speed_multipler').onchange = () => { 
        const speedEl = document.getElementById("cpu_speed_multipler");
        const speedMultiplier = speedEl ? parseFloat(speedEl.value) : 1.0;
        cpu.speed_multipler = speedMultiplier;
    }
    document.getElementById('btn_reset').onclick = () => { cpu.reset(); log('reset'); render(); };
    document.getElementById('btn_step').onclick = () => { cpu.next(1); render(); };
    document.getElementById('btn_step100').onclick = () => { cpu.next(100); render(); };
    document.getElementById('btn_step1000').onclick = () => { cpu.next(1000); render(); };
    document.getElementById('use_realTimeThrottle').onchange = () => { cpu.isRealtime = document.getElementById("use_realTimeThrottle").checked; }
    document.getElementById('btn_run').onclick = () => {
        if (cpu.running) return;
        cpu.running = true;
        document.getElementById('run_status').textContent = 'running...';
        renderSignalInputs();
        wd.startMonitoring();
        cpu.isRealtime = document.getElementById("use_realTimeThrottle").checked;
        cpu.gui_render_handler = render;
        cpu.start_emulator_loop();
        return;
        /* old way of executing the simulator
        runHandle = setInterval(() => {
            let updateCyclesCount_el = document.getElementById('updateCyclesCount');
        
            let updateCyclesCount = parseInt(updateCyclesCount_el.value);
            cpu.currentUpdateCyclesCount = updateCyclesCount;
            let res = cpu.next(updateCyclesCount);
            render();
            if(res == 0) {
            stopRun();
            }
            if (res == -1 && cpu.error_info.code !== CPU_NO_ERROR) {
            log('stopped: error ' + cpu.error_info.code + ' at ' + hex(cpu.error_info.addr,4));
            stopRun();
            }
        }, parseInt(document.getElementById('updateCyclesDelay').value));
        */
    };
    document.getElementById('btn_stop').onclick = stopRun;
    function stopRun() {
        cpu.running = false;
        wd.stopMonitoring();
        document.getElementById('run_status').textContent = '';
        if (runHandle) clearInterval(runHandle);
    }

    document.getElementById('btn_print_callstack').onclick = () => {
        console.log(cpu.getCallStackString());
    };

    
    render();
    renderSignalInputs();

    printDissassembly_toElement();
    //printDissassembly_toConsole();
});

