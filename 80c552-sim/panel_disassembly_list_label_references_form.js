function showReferences(addr) {
    showReferencesToLabelModal(addr);
}


function showReferencesToLabelModal(addr) {

    let refs = [];
    
    for (const [address, insn] of insn_map) {
        if (insn.target === addr) {
            refs.push(insn);
        }
    }

    // Sort after address
    refs.sort((a, b) => a.addr - b.addr);


    // ------------------------------------------------------------
    // Create modal content
    // ------------------------------------------------------------

    let content = createNewElement("div", {
        className: "list-label-references-content"
    });

    // List
    let list = createNewElement("div", {
        className: "list-label-references-list"
    });

    let header = createNewElement("div", {
        className: "list-label-references-header"
    });

    content.appendChild(header);
    content.appendChild(list);


    // ------------------------------------------------------------
    // Render
    // ------------------------------------------------------------

    function renderReferences() {

        list.replaceChildren();

        for (const item of refs) {

            let row = createNewElement("div", {
                className: "list-label-references-row", styles:{cursor:"default", paddingTop:'2px'}
            });


            let label = createNewElement("span", {
                className: "list-label-references-name"
            });

            label.textContent = item.text();


            let address = createNewElement("span", {
                className: "list-label-references-address"
            });

            address.textContent =
                item.addr.toString(16).padStart(4, "0").toUpperCase();


            row.appendChild(label);
            row.appendChild(address);


            row.onclick = () => {
                gotoDisasmAddress(item.addr);
            };


            list.appendChild(row);
        }
    }


    renderReferences();


    // ------------------------------------------------------------
    // Show modal
    // ------------------------------------------------------------
    window.list_label_references_modal.setBody(content);
    window.list_label_references_modal.mount();
    window.list_label_references_modal.open();
    /*showModal({
        title: "Goto label",
        content: content
    });*/
}