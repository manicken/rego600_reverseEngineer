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