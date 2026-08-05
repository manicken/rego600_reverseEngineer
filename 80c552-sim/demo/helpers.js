function hex(v, w = 2) { return '0x' + v.toString(16).toUpperCase().padStart(w, '0'); }

function printPrintable(value) {
    if (value < 0x20) { return '.'; }
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