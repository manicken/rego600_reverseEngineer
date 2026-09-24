

class MemoryView extends AppWindow {

    constructor({
        title = "Memory View", 
        columns=16, 
        memorysize, 
        reader = index => 0, 
        readusemap = [], 
        writeusemap = [], 
        consideredreadCount = 1, 
        consideredwriteCount = 1
    }) {
        super({title, resizable:true});
        this.reader = reader;
        this.columns = columns;
        this.memorysize = memorysize;
        this.readusemap = readusemap;
        this.writeusemap = writeusemap;
        this.consideredreadCount = consideredreadCount;
        this.consideredwriteCount = consideredwriteCount;

        const content = createNewElement("div", { className: "memory-view-content" });
        this.search = createNewElement("input", { className: "memory-view-search", type: "text", placeholder: "Search adress..." });

        this.list_el = createNewElement("div", { className: "memory-view-list" });
        const header = createNewElement("div", { className: "memory-view-header" });
        header.appendChild(this.search);
        content.appendChild(header);
        content.appendChild(this.list_el);
        this.search.oninput = () => this.#searchGotoAddress();
        this.setBody(content);

        this.virtualScroller = new VirtualScroller({
            viewportEl: this.list_el,
            createRow: () => this.#buildPoolRow(),
            bindRow: (line, index) => this.#bindPoolRowData(line, index),
            bufferRows: 8,
            rowHeight: 13,
        });
        this.virtualScroller.setCount(memorysize/this.columns);

        window.app.simulator.guirenderevents.push(
            () => {
                if (this.isOpen()) {
                    this.virtualScroller.refresh();
                }
            }
        );
    }

    #buildPoolRow() {
        const row_el = createNewElement("div", { className:"memory-view-row" });
        const address_el = createNewElement("div", {  });
        const data_in_hex_el = createNewElement("div", {  });
        const data_in_ascii_el = createNewElement("div", {  });
        row_el.append(address_el, data_in_hex_el, data_in_ascii_el);
        return {el:row_el, data:{row_el, address_el, data_in_hex_el, data_in_ascii_el}};
    }

    #bindPoolRowData(item, rowIndex) {
        let row_start_address = rowIndex*this.columns;
        item.address_el.textContent = hex(row_start_address,4);
        let data_in_hex = "";
        let data_in_ascii = "";
        
        for (let col = 0; col < this.columns; col++) {
            let addr = row_start_address + col;
            if (addr >= this.memorysize) { break; }
        
            let value = this.reader(addr);
            
            if (value === undefined) { value = NaN; } // handle out of bounds
            const readCount = this.readusemap[addr];
            const writeCount = this.writeusemap[addr];

            const readUsed = readCount >= this.consideredreadCount;
            const writeUsed = writeCount >= this.consideredwriteCount;


            if (readUsed && writeUsed) {
                data_in_hex += `<span class="ram_read_write_use_highlight" title="@ ${hex(addr,4)} R:${readCount} W:${writeCount}">${value.toString(16).padStart(2, '0')}</span> `;
            } else if (readUsed) {
                data_in_hex += `<span class="ram_read_use_highlight" title="@ ${hex(addr,4)} R:${readCount} W:${writeCount}">${value.toString(16).padStart(2, '0')}</span> `;
            } else if (writeUsed) {
                data_in_hex += `<span class="ram_write_use_highlight" title="@ ${hex(addr,4)} R:${readCount} W:${writeCount}">${value.toString(16).padStart(2, '0')}</span> `;
            } else {
                data_in_hex += `${value.toString(16).padStart(2, '0')} `;
            }
            
            data_in_ascii += printPrintable(value);
        }
        item.data_in_hex_el.innerHTML = `<div>${data_in_hex}</div>`;
        item.data_in_ascii_el.innerHTML = `<div>${data_in_ascii}</div>`;
    }

    #searchGotoAddress() {

    }
}

class XRAM_View extends MemoryView {

    static CreateNew_AndOpen() {
        return new XRAM_View().setStates({height:720, width:720}).open();
    }

    constructor() {
        super({ 
            title:"XRAM", 
            memorysize:(32*1024), 
            reader:index => cpu.bus.sram.mem[index],
            writeusemap: cpu.bus.sram.mem_write_use_map,
            readusemap: cpu.bus.sram.mem_read_use_map,
            consideredwriteCount: 4,
            consideredreadCount: 1,
        });

    }
}