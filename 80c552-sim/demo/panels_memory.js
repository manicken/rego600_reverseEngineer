function init_xram_view(container_id, id, startIndex) {
    let container = document.getElementById(container_id);
    if (container == undefined) return;
    container.style.flex = 1;
    container.style.maxWidth = '480px';
    appendH2_from_data_title(container);

    let index_el_id = "xram-view-index-"+id;
    let index_el = appendInputFieldWithLabel(container, "xram-view-index-"+id, "Index(0-127): ", {type:"number", value:startIndex, min:0, max:127, step:1, width:64});
    let view_el_id = "xram-view-" + id;
    let view_el = appendDiv(container, "memdump", view_el_id);
    view_el.style.maxHeight = "400px";
    index_el.oninput = () => {
        render_XRAM_window(index_el_id, view_el_id);
    };
    container.appendChild(view_el);
    return view_el;
}

function init_xram_write(container_id, count, setHandler) {
    let container = document.getElementById(container_id);
    if (container == undefined) return;

    container.style.flex = 1;
    container.style.maxWidth = '460px';
    appendH2_from_data_title(container);

    for (let i=0;i<count;i++) {
        appendWriteValueToAddressControl(container_id, "XRAM_" + i, "0x0000", "0x00", setHandler);
    }
}

function render_XRAM_window(index_elementID, view_elementID) {
  let element = document.getElementById(index_elementID);
  if (element == undefined) {
    console.error("cannot find element: " + index_elementID);
    return;
  }
  let xram_index = parseInt(element.value);
  if (Number.isNaN(xram_index)) {
	  xram_index = element.prev_index ? element.prev_index : 0;
  } else {
	  element.prev_index = xram_index;
  }

  document.getElementById(view_elementID).textContent = getMemoryContentsDump({
    reader: (index) => cpu.bus.sram.read(index),
    ascii: true,
    columns: 16,
    colheader: true,
    size: 256,
    offset: xram_index * 256,
    addressWidth: 4
  });
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