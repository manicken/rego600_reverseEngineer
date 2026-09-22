

let xram_views = [];

function init_memory_panels() {
   //init_XRAM_write();
    
    
    init_XRAM_views();
}
function init_XRAM_write() {
  let el = document.getElementById("directWriteXRAM");
  appendH2_from_data_title(el);
  el.appendChild(get_xram_write_contents(6, set_XRAM_value));
}

function init_XRAM_views() {
  let xram_view_els = document.getElementsByClassName("xram_view");
  for (let view_el of xram_view_els) {
    xram_views.push(init_xram_view(view_el));
  }
}
function render_XRAM_windows() {
  for (let view of xram_views) {
    render_XRAM_window(view);
  }
}

function init_xram_view(view_el) {
    
  let header_el = createNewElement("div", {className:"row"});

    appendH2(header_el, view_el.dataset.title);
    //appendH2_from_data_title(header_el);

    let index_el = appendInputFieldWithLabel(header_el, {type:"number", labelText:"Index(0-127): ", value:view_el.dataset.start_index, min:0, max:127, step:1, styles:{width:'64px', height:'22px', paddingBottom:'0px', paddingTop:'0px'}});
    let memdump_el = createNewElement("div", {className:"memdump"});

    let component = { memdump_el, index_el };
    index_el.oninput = () => {
        render_XRAM_window(component);
    };
    view_el.appendChild(header_el);
    view_el.appendChild(memdump_el);
    return component;
}

function get_xram_write_contents(count, setHandler) {
    let container = createNewElement('div');
    container.style.flex = 1;
    container.style.maxWidth = '330px';
    

    for (let i=0;i<count;i++) {
        appendWriteValueToAddressControl(container, "XRAM_" + i, "0x0000", "0x00", setHandler);
    }
    return container;
}

function render_XRAM_window(component) {
  
  let xram_index = parseInt(component.index_el.value);
  if (Number.isNaN(xram_index)) {
	  xram_index = component.index_el.prev_index ? component.index_el.prev_index : 0;
  } else {
	  component.index_el.prev_index = xram_index;
  }

  component.memdump_el.innerHTML = getMemoryContentsDump({
    reader: index => cpu.bus.sram.mem[index],
    writeusemap: cpu.bus.sram.mem_write_use_map,
    readusemap: cpu.bus.sram.mem_read_use_map,
    consideredwriteCount: 4,
    consideredreadCount: 1,
    ascii: true,
    columns: 16,
    useColheader: true,
    size: 256,
    offset: xram_index * 256,
    addressWidth: 4
  });
}

function render_IRAM() {
  document.getElementById('iram_dump').innerHTML = getMemoryContentsDump({
    reader: index => cpu.IRAM[index],
    usemap: cpu.IRAM_USE_MAP,
    ascii: true,
    columns: 16,
    useColheader: true,
    size: 256,
    offset: 0,
    addressWidth: 2
  });
}

function render_DATA_FLASH_window() {
  const sel = cpu.bus.readSelect();
  const base = (sel.ext << 20) & (cpu.bus.flash.size - 1);

  document.getElementById('flash_dump').innerHTML = getMemoryContentsDump({
    reader: index => cpu.bus.flash.read(index, false),
    ascii: true,
    columns: 20,
    useColheader: true,
    size: 300,
    offset: base,
    addressWidth: 5
  });
}

function renderMemDumps() {
  render_IRAM();
  render_XRAM_windows();
  //render_DATA_FLASH_window();  
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

function getMemoryContentsDump({reader, usemap, readusemap, writeusemap, consideredreadCount=1, consideredwriteCount=1, ascii, columns, useColheader, size, offset, addressWidth}={}) {
    const lines = [];
    const totalRows = Math.ceil(size/columns);
    const addressPrefix = hex(0, addressWidth) + ': ';
    const colHeaderWidth = addressPrefix.length;

    if (usemap !== undefined) {
        readusemap = usemap;
        writeusemap = usemap;
    }
    if (readusemap == undefined) {
        readusemap = [];
    }
    if (writeusemap == undefined) {
        writeusemap = [];
    }

    if (useColheader) {
        let colHeader = "";
        for (let col = 0; col < columns; col++) {
            colHeader += col.toString(16).padStart(2,'0') + " ";
        }
        lines.push(" ".repeat(colHeaderWidth) + colHeader);
    }
    for (let row = 0; row < totalRows; ++row) {
        let line = hex(offset + row*columns, addressWidth) + ': ';
        let ascii_text = "";
        for (let col = 0; col < columns; col++) {
            let index = row*columns + col;
            if (index >= size) { break; }
            let addr = offset + index;
            let value = reader(addr);
            
            if (value === undefined) { break; } // handle out of bounds
            const readCount = readusemap[addr];
            const writeCount = writeusemap[addr];

            const readUsed = readCount >= consideredreadCount;
            const writeUsed = writeCount >= consideredwriteCount;


            if (readUsed && writeUsed) {
                line += `<span class="ram_read_write_use_highlight" title="R:${readCount} W:${writeCount}">${value.toString(16).padStart(2, '0')}</span> `;
            } else if (readUsed) {
                line += `<span class="ram_read_use_highlight" title="R:${readCount} W:${writeCount}">${value.toString(16).padStart(2, '0')}</span> `;
            } else if (writeUsed) {
                line += `<span class="ram_write_use_highlight" title="R:${readCount} W:${writeCount}">${value.toString(16).padStart(2, '0')}</span> `;
            } else {
                line += `${value.toString(16).padStart(2, '0')} `;
            }
            

            if (ascii) {
                ascii_text += printPrintable(value);
            }
        }
        if (ascii) {
          while (ascii_text.length < columns) {
              ascii_text += ' ';
          }
          lines.push(line + " " + ascii_text);
        } else {
          lines.push(line);
        }
        
    }
    return lines.join('\n');
}

/*
<!--  
    <div class="panel" style="flex:1; min-width:320px;">
      <h2>Flash (AM29F040) — window around DPTR/ext bank, 256 bytes</h2>
      <button id="btn_activate_29f040_read_logging_on" onclick="cpu.bus.flash.logReads = true;">29f EnableLogging</button>
    <button id="btn_activate_29f040_read_logging_off" onclick="cpu.bus.flash.logReads = false;">29f DisableLogging</button>
      <div class="memdump" id="flash_dump"></div>
    </div>
  -->
*/

/*
<!--  
  <div class="panel" style="min-width:260px;">
      <h2>External Memory Bus (P4 GPIO)</h2>
      <div id="p4bits"></div>
      <div style="margin-top:8px;">
        Bank: <span id="bank_state" class="val">-</span> &nbsp;
        Ext addr (A16-A18): <span id="ext_state" class="val">-</span>
      </div>
      <small>P4.0 = bank select (0=SRAM 32K, 1=AM29F040 flash) · P4.1-3 = A16-A18 into flash</small>
    </div>
  -->
*/