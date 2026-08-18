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
    appendInputFieldWithLabel(input_cmd_row_el, input_cmd_el_id, "Cmd: ", {type:"text", value:"0x00", width:32});
    appendInputFieldWithLabel(input_param1_row_el, input_param1_el_id, "Param1 (reg index): ", {type:"text", value:"0x00", width:44});
    appendInputFieldWithLabel(input_param2_row_el, input_param2_el_id, "Param2 (value): ", {type:"text", value:"0x00", width:44});
    appendBr(container);
    appendBr(container);
    appendButton(container, "Send").onclick = () => {
        service_port_request_any(input_cmd_el_id, input_param1_el_id, input_param2_el_id);
    };
}
