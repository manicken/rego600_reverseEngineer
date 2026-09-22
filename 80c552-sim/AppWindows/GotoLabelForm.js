
class GotoLabelForm extends AppWindow {

    /*static get TYPE() {
        return this.name;
    }*/

    static #FilterTypeAll = -1;
    
    constructor({onOpen, filters, onGotoAddress = (addr) => { CallBackNotSetDialog("onGotoAddress @ GotoLabelForm"); } }) {
        super({ title: "Goto Label", singleton: true, onOpen, onShow:onOpen, resizable: true });
        this.onGotoAddress = onGotoAddress;
        this.filters = [[GotoLabelForm.#FilterTypeAll, "All"], ...filters];
        this.filteredLabels = [];
        this.#initContent();
    }

    #buildPoolRow() {
        const row_el = createNewElement("div", { className: "goto-label-row", styles: {  } });
        const label_el = createNewElement("span", { className: "goto-label-name" });
        const address_el = createNewElement("span", { className: "goto-label-address" });
        row_el.append(label_el, address_el);
        return {el:row_el, data:{row_el, label_el, address_el}};
    }
    #bindPoolRowData(line, index) {
        const label = this.filteredLabels[index];

        line.label_el.textContent = label.label;
        line.address_el.textContent = hex(label.address,4,false);

        line.row_el.onclick = () => {
            this.onGotoAddress(label.address);
        };
    }
    
    #initContent() {
        const content = createNewElement("div", { className: "goto-label-content" });
        this.search = createNewElement("input", { className: "goto-label-search", type: "text", placeholder: "Search label..." });
        this.filter = createNewElement("div", { className: "goto-label-filter" });
        this.currentFilter = GotoLabelForm.#FilterTypeAll;
        this.filterButtons = {};

        for (const [type, text] of this.filters) {
            const button = createNewElement("button", { className: "goto-label-filter-button", textContent: text,
                onclick: () => {
                    this.currentFilter = type;

                    for (const [buttonType, buttonEl] of Object.entries(this.filterButtons)) {
                        buttonEl.classList.toggle( "active", buttonType === this.currentFilter );
                    }
                    this.renderLabels();
                }
            });
            this.filterButtons[type] = button;
            this.filter.appendChild(button);
        }

        this.filterButtons[GotoLabelForm.#FilterTypeAll].classList.add("active");
        this.list_el = createNewElement("div", { className: "goto-label-list" });
        const header = createNewElement("div", { className: "goto-label-header" });
        header.appendChild(this.search);
        header.appendChild(this.filter);
        content.appendChild(header);
        content.appendChild(this.list_el);
        this.search.oninput = () => this.renderLabels();
        this.setBody(content);

        this.virtScroller = new VirtualScroller({
            viewportEl: this.list_el,
            createRow: () => this.#buildPoolRow(),
            bindRow: (line, index) => this.#bindPoolRowData(line, index),
            bufferRows: 8,
            rowHeight: 27,
        });
    }

    renderLabels() {
        
        this.filteredLabels = [];
        const searchText = this.search.value.toLowerCase().trim();

        for (const item of this.labels) {

            if (this.currentFilter !== GotoLabelForm.#FilterTypeAll && item.type !== this.currentFilter) {
                continue;
            }

            if (searchText && !item.label.toLowerCase().includes(searchText)) {
                continue;
            }
            this.filteredLabels.push(item);

        }
        //console.trace("renderLabels:", this.filteredLabels); // här är this.filteredLabels defined
        this.virtScroller.setCount(this.filteredLabels.length);
       // this.virtScroller.refresh();
    }

    generateList(insn_map) {
        this.rowHeight = this.virtScroller.measureRowHeight();
        this.labels = [];
        for (const [address, insn] of insn_map) {
            if (insn.labelType == undefined) continue;
            this.labels.push({ address, label: insn.label, type:insn.labelType });
        }
        this.labels.sort((a, b) => a.address - b.address);
        this.renderLabels();
    }
}