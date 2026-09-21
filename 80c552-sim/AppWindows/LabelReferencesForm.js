class LabelReferencesForm extends AppWindow {

    #initialized = false;
    constructor({onGotoAddress = (addr) => { CallBackNotSetDialog("onGotoAddress @ LabelReferencesForm"); } }) {
        super({title:"Address References", singleton:true, height:768, width:420, resizable: true})
        this.onGotoAddress = onGotoAddress;
    }
    #initialize() {
        this.#initialized = true;

        let content = createNewElement("div", {
            className: "list-label-references-content"
        });

        // List
        this.list_el = createNewElement("div", {
            className: "list-label-references-list"
        });

        let header = createNewElement("div", {
            className: "list-label-references-header"
        });

        content.appendChild(header);
        content.appendChild(this.list_el);
        this.setBody(content);
    }
    #renderReferences() {

        this.list_el.replaceChildren();

        for (const item of this.refs) {

            let row = createNewElement("div", { className: "list-label-references-row", styles:{cursor:"default", paddingTop:'2px'} });
            let label = createNewElement("span", { className: "list-label-references-name" });

            label.textContent = item.text();

            let address = createNewElement("span", { className: "list-label-references-address" });

            address.textContent = item.addr.toString(16).padStart(4, "0").toUpperCase();


            row.appendChild(label);
            row.appendChild(address);

            row.onclick = () => { this.onGotoAddress(item.addr); };

            this.list_el.appendChild(row);
        }
    }
    open(insn_map, addr = null) {
        if (addr == null) {
            InfoDialog.Show({message:"LabelReferencesForm - addr cannot be undefined"});
            return;
        }
        if (!this.#initialized) {
            this.#initialize();
        }
        super.open();
        this.refs = [];
    
        for (const [address, insn] of insn_map) {
            if (insn.target === addr) {
                this.refs.push(insn);
            }
        }

        // Sort after address
        this.refs.sort((a, b) => a.addr - b.addr);

        this.#renderReferences();
    }
}
