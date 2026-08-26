/*
<button onclick="service_port_send(0x7F)">Get version</button>
      <button onclick="service_port_send(0x02, 0x209)">Get GT1</button>
      <button onclick="service_port_send(0x02, 0x20A)">Get GT2</button>
      <button onclick="service_port_send(0x02, 0x20B)">Get GT3</button>
      <button onclick="service_port_send(0x02, 0x20C)">Get GT4</button>
      <button onclick="service_port_send(0x02, 0x20D)">Get GT5</button>
      <button onclick="service_port_send(0x02, 0x20E)">Get GT6</button>
      <button onclick="service_port_send(0x02, 0x20F)">Get GT8</button>
      <button onclick="service_port_send(0x02, 0x210)">Get GT9</button>
      <button onclick="service_port_send(0x02, 0x211)">Get GT10</button>
      <button onclick="service_port_send(0x02, 0x212)">Get GT11</button>
      <button onclick="service_port_send(0x02, 0x213)">Get GT3X</button>
      <button onclick="service_port_send(0x40)">Get Last Error</button>
      <button onclick="service_port_send(0x42)">Get Prev. Error</button>
      <br>
      <br>
      <button onclick="service_port_send(0x07, 0x28, 0xFFFF);">set timeout to max</button>
      <button onclick="service_port_send(0x07, 0x39, 0x2C9C);">set 5.12 menu</button>
      <br>
      <br>
      <button onclick="service_port_send(0x01, 0x38, 0x8);">factory mode</button>
      <button onclick="service_port_send(0x01, 0x38, 0x1);">customer 1 mode</button>
      <button onclick="service_port_send(0x01, 0x38, 0x2);">customer 2 mode</button>

      {label:"", cmd:0, p1:0, p2:0}
*/
let service_IF_predefined_buttons = [
    {label:"Get version", cmd:0x7F, p1:0x00, p2:0x00},
    {label:"Get GT1", cmd:0x02, p1:0x209, p2:0x00},
   /* {label:"Get GT2", cmd:0x02, p1:0x20A, p2:0x00},
    {label:"Get GT3", cmd:0x02, p1:0x20B, p2:0x00},
    {label:"Get GT4", cmd:0x02, p1:0x20C, p2:0x00},
    {label:"Get GT5", cmd:0x02, p1:0x20D, p2:0x00},
    {label:"Get GT6", cmd:0x02, p1:0x20E, p2:0x00},
    {label:"Get GT8", cmd:0x02, p1:0x20F, p2:0x00},
    {label:"Get GT9", cmd:0x02, p1:0x210, p2:0x00},
    {label:"Get GT10", cmd:0x02, p1:0x211, p2:0x00},
    {label:"Get GT11", cmd:0x02, p1:0x212, p2:0x00},
    {label:"Get GT3X", cmd:0x02, p1:0x213, p2:0x00},
    undefined,
    undefined,
    {label:"Get Last Error", cmd:0x40, p1:0x00, p2:0x00},
    {label:"Get Prev Error", cmd:0x42, p1:0x00, p2:0x00},
    undefined,
    undefined,*/
    {label:"set timeout to max", cmd:0x07, p1:0x28, p2:0xFFFF},
    {label:"set 5.12 menu", cmd:0x07, p1:0x39, p2:0x2C9C},
    undefined,
    undefined,
    {label:"Cust.1-access", cmd:0x01, p1:0x38, p2:0x01},
    {label:"Cust.2-access", cmd:0x01, p1:0x38, p2:0x02},
    {label:"I/S-access", cmd:0x01, p1:0x38, p2:0x04},
    {label:"F-access", cmd:0x01, p1:0x38, p2:0x08},
];

function init_service_interface_panel(container_id) {
    let container = document.getElementById(container_id);
    container.style.flex = '1';
    container.style.maxWidth = '300px';
    appendH2_from_data_title(container);

    for (let i=0;i<service_IF_predefined_buttons.length;i++) {
        let item = service_IF_predefined_buttons[i];
        if (item !== undefined) {
            appendButton(container, item.label).onclick = () => {
                service_port_send(item.cmd, item.p1, item.p2);
            };
        } else {
            appendBr(container);
        }
    }
    append_SPIF_customSender(container, "A");
    //append_SPIF_customSender(container, "B");
}

function append_SPIF_customSender(container, id) {
    let input_cmd_el_id = "service-port-if-cmd-" + id;
    let input_param1_el_id = "service-port-if-param1-" + id;
    let input_param2_el_id = "service-port-if-param2-" + id;
    let input_cmd_row_el = appendDiv(container, "row");
    let input_param1_row_el = appendDiv(container, "row");
    let input_param2_row_el = appendDiv(container, "row");
    appendBr(container);
    appendInputFieldWithLabel(input_cmd_row_el, {type:"text", id:input_cmd_el_id, labelText:"Cmd: ", value:"0x00", styles:{width:'32px'}});
    appendInputFieldWithLabel(input_param1_row_el, {type:"text", id:input_param1_el_id, labelText:"Reg index: ", value:"0x00", styles:{width:'44px'}});
    appendInputFieldWithLabel(input_param2_row_el, {type:"text", id:input_param2_el_id, labelText:"Value: ", value:"0x00", styles:{width:'44px'}});
    appendBr(container);
    appendButton(container, "Send").onclick = () => {
        service_port_request_any(input_cmd_el_id, input_param1_el_id, input_param2_el_id);
    };
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