function parseNumber(v)
{
    v = v.trim();

    if(v.startsWith("0x") || v.startsWith("0X"))
        return parseInt(v, 16);

    return parseInt(v, 10);
}

function hex(v, w = 2, prefix=true) { return (prefix?'0x':'') + v.toString(16).toUpperCase().padStart(w, '0'); }

function getBytesInAsciiHex(bytes, separator=' ') {
    let ret = "";
    for (let i=0;i<bytes.length;i++) {
        if (i>0) { ret += separator; }
        ret += hex(bytes[i]);
    }
    return ret;
}

function printPrintable(value, nonPrintableAsHex=false) {
    if (value < 0x20) { return nonPrintableAsHex?("["+hex(value,false)+"]"):'.'; }
    return String.fromCharCode(value);
}
function getMemoryContentsDump(p={reader, ascii, columns, colheader, size, offset, addressWidth}) {
    const lines = [];
    const totalRows = Math.ceil(p.size/p.columns);
    const addressPrefix = hex(0, p.addressWidth) + ': ';
    const colHeaderWidth = addressPrefix.length;

    if (p.colheader) {
        let colHeader = "";
        for (let col = 0; col < p.columns; col++) {
            colHeader += col.toString(16).padStart(2,'0') + " ";
        }
        lines.push(" ".repeat(colHeaderWidth) + colHeader);
    }
    for (let row = 0; row < totalRows; ++row) {
        let line = hex(p.offset + row*p.columns, p.addressWidth) + ': ';
        let ascii_text = "";
        for (let col = 0; col < p.columns; col++) {
            let index = row*p.columns + col;
            if (index >= p.size) { break; }
            
            let value = p.reader(p.offset + index);
            
            if (value === undefined) { break; } // handle out of bounds
            line += value.toString(16).padStart(2,'0') + " ";
            if (p.ascii) {
                ascii_text += printPrintable(value);
            }
        }
        if (p.ascii) {
          while (ascii_text.length < p.columns) {
              ascii_text += ' ';
          }
          lines.push(line + " " + ascii_text);
        } else {
          lines.push(line);
        }
        
    }
    return lines.join('\n');
}

function pinNameToStruct(pinName) {
    const match = /^P(\d+)\.(\d+)$/.exec(pinName);

    if (!match)
        throw new Error(`Invalid pin name: ${pinName}`);

    const port = cpu[`P${match[1]}`];
    const bit = Number(match[2]);

    if (!port)
        throw new Error(`Port P${match[1]} does not exist`);

    if (bit < 0 || bit > 7)
        throw new Error(`Invalid bit number: ${bit}`);

    return { port, bit };
}
function appendInputFieldWithLabel(container, id, label, inputOptions) {
    //let container = document.getElementById(container_id);
    let labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    container.appendChild(labelEl);
    let inputEl = document.createElement('input');
    inputEl.id = id;
    inputEl.type = inputOptions.type;
    inputEl.value = inputOptions.value;
    inputEl.min = inputOptions.min;
    inputEl.max = inputOptions.max;
    inputEl.step = inputOptions.step;
    if (inputOptions.width) {
        inputEl.style.width = `${inputOptions.width}px`
    }
    container.appendChild(inputEl);
    return inputEl;
}

function appendButton(container, label, id) {
    let btn = document.createElement("button");
    btn.textContent = label;
    btn.id = id;
    container.appendChild(btn);
    return btn;
}

function appendWriteValueToAddressControl(container_id, id_base, initial_addr, initial_value, setHandler) {
    let container = document.getElementById(container_id);
    let control = document.createElement("div");
    control.className = "row";
    let addrInputId = `write-to-${id_base}-addr`;
    let valueInputId = `write-to-${id_base}-value`;
    if (initial_addr == undefined) {
        initial_addr = "0x0000";
    }
    if (initial_value == undefined) {
        initial_value = "0x00";
    }
    container.appendChild(document.createElement('hr'));
    appendInputFieldWithLabel(control, addrInputId, "Address:", {type:"text", value:initial_addr, width:48});
    appendInputFieldWithLabel(control, valueInputId, "Value:", {type:"text", value:initial_value, width:48});
    let btnSet = document.createElement("button");
    btnSet.textContent = "Set";
    btnSet.onclick = function () {
        let addrValue = parseNumber(document.getElementById(addrInputId).value);
        let valueValue = parseNumber(document.getElementById(valueInputId).value);
        setHandler(addrValue, valueValue);
    };
    control.appendChild(btnSet);
    container.appendChild(control);
}

function appendDiv(container, className, id) {
    let div_el = document.createElement("div");
    div_el.className = className;
    div_el.id = id;
    container.appendChild(div_el);
    return div_el;
}

function appendBr(container) {
    container.appendChild(document.createElement("br"));
}
function appendH2(container, text) {
    let header_el = document.createElement("h2");
    header_el.textContent = text;
    container.appendChild(header_el);
}
function appendH2_from_data_title(container) {
    let header_el = document.createElement("h2");
    header_el.textContent = container.dataset.title;
    container.appendChild(header_el);
}