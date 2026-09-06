class CharLCDSim {
    constructor({container, chargen, rows=2, columns=16, charWidth=5, charHeight=8, pixelSize = 1, width=240, height=72, pixelOnColor="#FFF", pixelOffAlpha=0x0A, imageRendering='pixelated'}) {
        if (container == undefined) {
            throw Error("CharLCDSim container cannot be undefined");
        }
        if (chargen == undefined) {
            throw Error("CharLCDSim chargen cannot be undefined");
        }
        this.pixelSize = Math.round(pixelSize);
        this.chargen = chargen;
        this.charWidth = charWidth;
        this.charHeight = charHeight;
        this.rows = rows;
        this.columns = columns;
        this.debugPrintRenderChar = false;
        this.char_Xdistance = (charWidth+1) * this.pixelSize;
        this.char_Ydistance = (charHeight+1) * this.pixelSize;
        this.setPixelOffAlpha(pixelOffAlpha);
        this.pixelOnColor = pixelOnColor;

        
        this.lcd_el_width = columns*this.char_Xdistance;
        this.lce_el_height = rows*this.char_Ydistance;
        this.lcd_el = appendNewElement(container, 'canvas', {className:"lcd", styles:{width:width + 'px', height:height + 'px'}});

        this.lcd_el.width = this.lcd_el_width;
        this.lcd_el.height = this.lce_el_height;
        if (imageRendering) {
            this.lcd_el.style.imageRendering = imageRendering;
        }
        
    }

    setPixelOffAlpha(alpha) {
        this.pixelOffAlpha = "#ffffff" + alpha.toString(16).padStart(2,'0');
        console.log(this.pixelOffAlpha);
    }

    setBacklight(on) {
        this.lcd_el.classList.toggle("backlight-on", on);
    }
    /** row and col is zero based, and row=0, col=0 is the first position on top-left */
    renderChar(char, row, col) {
        if (this.debugPrintRenderChar === true && row == 2) {
            console.log(`renderChar(${hex(char)}, row:${row}, col:${col})`);
        }
        
        const ctx = this.lcd_el.getContext("2d");
        ctx.imageSmoothingEnabled = true;

        const glyph = this.chargen[char];
        const x = col * this.char_Xdistance;
        const y = row * this.char_Ydistance;

        for (let byi = 0; byi < this.charHeight; byi++) {
            let bits = glyph[byi];

            if (bits == undefined) bits = 0x00; // allways render empty if charrom character dont use the extra data

            for (let bii = 0; bii < this.charWidth; bii++) {
                const active = (bits & (1 << (this.charWidth-1 - bii)));
                if (active) {
                    ctx.fillStyle = this.pixelOnColor;
                    ctx.fillRect(
                        x + bii * this.pixelSize,
                        y + byi * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                } else {
                    ctx.clearRect(
                        x + bii * this.pixelSize,
                        y + byi * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                    ctx.fillStyle = this.pixelOffAlpha;
                    ctx.fillRect(
                        x + bii * this.pixelSize,
                        y + byi * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
    }
}


function print_cgrom_as_binary() {
    let dump = "let lcd_sim_chargen_edit = {\n";

    for (let ci = 0; ci < 255; ci++) {
        if (ci > 0) { dump += ',\n'; }
        dump += hex(ci,2) + ':[\n';
        let charData = window.app.lcd_sim.chargen[ci];
        if (charData == undefined) charData = [];
        for (let di = 0; di < charData.length; di++) {
            if (di > 0) dump += ',\n';
            let data = charData[di];
            dump += '  "' + data.toString(2).padStart(5, '0').replaceAll('0', ' ').replaceAll('1', '█') + '"'; // █
        }
        dump += '\n]';
    }
    dump += '\n};\n';
    console.log(dump);
}

function binary_from_glyph(str) {
    return parseInt(
        str.replaceAll('█', '1').replaceAll(' ', '0'),
        2
    );
}

function print_chargen_edit_as_hex() {
    let dump = "let lcd_sim_chargen = {\n";

    for (let ci = 0; ci < 255; ci++) {
        if (ci > 0) { dump += ',\n'; }
        dump += hex(ci,2) + ':[';
        let charEditDataBytes = lcd_sim_chargen_edit[ci];
        if (charEditDataBytes == undefined) {
            charEditDataBytes = [];
        }
        for (let di=0; di < charEditDataBytes.length; di++) {
            if (di > 0) dump += ',';
            let charEditData = charEditDataBytes[di];
            let charData = 0;
            if (charEditData != undefined) {
                charData = binary_from_glyph(charEditData);
            }
            dump += '0x' + charData.toString(16).padStart(2, '0');
        }
        dump += ']';
        
    }
    dump += '\n}\n';
    console.log(dump);
}

//print_chargen_edit_as_hex();

/* only used once to convert a bad generated cggen table
print_cgrom_as_hex() {
    let dump = "{\n";

    for (let ci = 0; ci < lcd_sim_cgfont.length; ci++) {
        if (ci > 0) dump += ',\n';
        dump += "  " + hex(ci,2) + ':[';
        let charData = lcd_sim_cgfont[ci];
        let dataCount = Math.max(7,charData.length);
        for (let di = 0; di < dataCount; di++) {
            if (di > 0) dump += ',';
            let data = charData[di];
            if (data == undefined) data = 0x00;
            dump += '0x' + data.toString(16).padStart(2, '0');
        }
        dump += ']';
    }
    dump += '\n}\n';
    console.log(dump);
}
*/