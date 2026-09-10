class ProfilerItem {

    constructor({enabled = true, startAddr = 0, endAddr = 0, label =""} = {}){
        this.enabled = enabled;
        this.startAddr = startAddr;
        this.endAddr = endAddr;
        this.label = label;
        this._active = false;
        this._cycles = 0;
        this.minValue = Infinity;
        this.maxValue = 0;
        this.minValue_el = undefined;
        this.maxValue_el = undefined;
        this.onRemove = () => {};
    }
    startMeasure() {
        this._active = true;
        this._cycles = 0;
    }
}

class Profiler {

    #buttonBar = [
        {
            text: "Add",
            onClick: () => {this.#addNewRow(new ProfilerItem({enabled: true}))}
        },
        {
            text: "Save",
            onClick: () => {this.#save()}
        },
    ];
    /** @type {ProfilerItem[]} */
    #profilingItems = [];
    /** @type {Setting} */
    #profilingData = undefined;

    

    constructor() {
        
        window.app.cpu.instruction_ticks.push((cycles, opcode_start_PC) => {this.#profilerTask(cycles, opcode_start_PC)});

        this.modal = new Modal({title:"Profiler", height:600, width:600, resizable: true});
        this.modal.bodyEl.innerHTML = "";
        setStyles(this.modal.bodyEl, { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding:'6px', boxSizing: 'border-box' });
        this.header_el = appendNewElement(this.modal.bodyEl, 'div', { styles: { width: '100%', /*height: '32px',*/ display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding:'4px' }})
        this.body_el = appendNewElement(this.modal.bodyEl, 'div', { styles: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', boxSizing: 'border-box' } });
        let buttons_el = createButtonBar(this.#buttonBar);
        this.header_el.appendChild(buttons_el);

        this.#profilingData = new Setting('profiling', curr_firmware.profiling);
        this.#load();
    }
    #load() {
        for (let item of this.#profilingData.value) {
            this.#addNewRow(new ProfilerItem(item));
        }
    }

    #save() {
        this.#profilingData.value = this.#profilingItems.map(item => ({
            startAddr: item.startAddr,
            endAddr: item.endAddr,
            enabled: item.enabled,
            label: item.label
        }));

        this.#profilingData.save();
    }

    openModal()
    {
        this.modal.open();
    }

    #getCyclesTime(cycles) {
        let time_uS = Math.round((cycles*1000000)/921600);
        if (time_uS > 1000) {
            return (time_uS/1000).toFixed(3) + " mS";
        } else {
            return time_uS + ' uS';
        }
    }

    #profilerTask(cycles, opcode_start_PC) {
        for (let item of this.#profilingItems) {
            if (!item.enabled) continue;

            if (item.startAddr == opcode_start_PC) {
                item.startMeasure();
            }

            if (item._active) {
                item._cycles += cycles;
            }
            
            if(item._active && item.endAddr == opcode_start_PC) {
                item._active = false;
                item.minValue = Math.min(item.minValue, item._cycles);
                item.maxValue = Math.max(item.maxValue, item._cycles);
                item.minValue_el.textContent = item.minValue;
                item.maxValue_el.textContent = item.maxValue;
                //log(`profiling of range ${hex(item.startAddr,4)} - ${hex(item.endAddr,4)} = ${item.cycles} cycles => ${this.#getCyclesTime(item.cycles)}`);
            }
        }
    }

    /** @param {ProfilerItem} item */
    #addNewRow(item) {
        item.onRemove = () => {
            const index = this.#profilingItems.indexOf(item);
            if (index !== -1) {
                this.#profilingItems.splice(index, 1);
            }
        };

        this.#profilingItems.push(item);
        this.body_el.appendChild(this.#getProfilerRow(item));
    }

    /** @param {ProfilerItem} item */
    #getProfilerRow(item) {
        let row_el = createNewElement('div', {className:'profiler-grid-row'});

        let enabled_el = createNewElement('input', {type:'checkbox', checked:item.enabled});
        let startAddr_el = createNewElement('input', {type:'text', value:hex(item.startAddr,4)});
        let endAddr_el = createNewElement('input', {type:'text', value:hex(item.endAddr,4)});
        let minValue_el = createNewElement('div', {className:'profiler-measured-value'});
        let maxValue_el = createNewElement('div', {className:'profiler-measured-value'});
        let removeBtn_el = createNewElement('button', {className:'profiler-remove-item-btn', textContent:"\u00d7"});
        let label_el = createNewElement('input', {type:'text', value:item.label});
        enabled_el.onchange = (e) => {
            item.enabled = enabled_el.checked;
        }
        startAddr_el.onchange = (e) => {
            const value = parseInt(startAddr_el.value, 16);
            if (!Number.isNaN(value)) {
                item.startAddr = value;
            }
        }
        endAddr_el.onchange = (e) => {
            const value = parseInt(endAddr_el.value, 16);
            if (!Number.isNaN(value)) {
                item.endAddr = value;
            }
        }
        label_el.onchange = (e) => {
            item.label = label_el.value;
        }
        
        removeBtn_el.onclick = (e) => {
            row_el.remove();
            item.onRemove();
        }
        
        item.minValue_el = minValue_el;
        item.maxValue_el = maxValue_el;

        row_el.append(enabled_el, startAddr_el, endAddr_el, minValue_el, maxValue_el, label_el, removeBtn_el);
        return row_el;
    }
}