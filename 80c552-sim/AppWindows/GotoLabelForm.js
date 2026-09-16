
class GotoLabelForm extends AppWindow {

    static #FilterTypeAll = -1;
    
    constructor({filters, onGotoAddress = (addr) => { CallBackNotSetDialog("onGotoAddress @ GotoLabelForm"); } }) {
        super({ title: "Goto Label", type: "GotoLabelForm", singletonID:"gotoLabel", height: 768, width: 420, resizable: true });
        this.onGotoAddress = onGotoAddress;
        this._initialized = false;
        this.filters = [[GotoLabelForm.#FilterTypeAll, "All"], ...filters];
        this._initContent();
    }

    _initContent() {
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
        this.list = createNewElement("div", { className: "goto-label-list" });
        const header = createNewElement("div", { className: "goto-label-header" });
        header.appendChild(this.search);
        header.appendChild(this.filter);
        content.appendChild(header);
        content.appendChild(this.list);
        this.search.oninput = () => this.renderLabels();
        this.setBody(content);
        this._initialized = true;
    }

    renderLabels() {
        this.list.replaceChildren();

        const searchText = this.search.value.toLowerCase().trim();

        for (const item of this.labels) {

            if (this.currentFilter !== GotoLabelForm.#FilterTypeAll && item.type !== this.currentFilter) {
                continue;
            }

            if (searchText && !item.label.toLowerCase().includes(searchText)) {
                continue;
            }

            const row = createNewElement("div", { className: "goto-label-row", styles: { cursor: "default", paddingTop: "2px" } });
            const label = createNewElement("span", { className: "goto-label-name" });
            label.textContent = item.label;
            const address = createNewElement("span", { className: "goto-label-address" });
            address.textContent = item.address.toString(16).padStart(4, "0").toUpperCase();
            row.append(label, address);
            row.onclick = () => { this.onGotoAddress(item.address); };
            this.list.appendChild(row);
        }
    }

    generateList(insn_map) {
        this.labels = [];
        for (const [address, insn] of insn_map) {
            if (insn.labelType == undefined) continue;
            this.labels.push({ address, label: insn.label, type:insn.labelType });
        }
        this.labels.sort((a, b) => a.address - b.address);
        this.renderLabels();
    }
}