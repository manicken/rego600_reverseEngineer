function gotoLabel() {
    showGotoLabelModal();
}


function showGotoLabelModal() {

    // Hämta alla labels som finns i disassemblyn
    let labels = [];
    
    for (const [address, insn] of insn_map) {

        if (insn.labelType == js51_disasm.LabelType.User) {
            labels.push({
                address: address,
                label: insn.label,
                type: "user"
            });
        }
        else if (insn.labelType == js51_disasm.LabelType.Func) {
            labels.push({
                address: address,
                label: insn.label,
                type: "func"
            });
        }
        else if (insn.labelType == js51_disasm.LabelType.Jump) {
            labels.push({
                address: address,
                label: insn.label,
                type: "jmp"
            });
        }
    }

    // Sortera efter address
    labels.sort((a, b) => a.address - b.address);


    // ------------------------------------------------------------
    // Create modal content
    // ------------------------------------------------------------

    let content = createNewElement("div", {
        className: "goto-label-content"
    });


    // Search
    let search = createNewElement("input", {
        className: "goto-label-search",
        type: "text",
        placeholder: "Search label..."
    });

    // Filter
    let filter = createNewElement("div", {
        className: "goto-label-filter"
    });


    let currentFilter = "all";

    const filters = [
        ["all",  "All"],
        ["user", "User"],
        ["func", "Functions"],
        ["jmp",  "Jumps"]
    ];


    let filterButtons = {};


    for (const [type, text] of filters) {

        let button = createNewElement("button", {
            className: "goto-label-filter-button"
        });

        button.textContent = text;

        button.onclick = () => {

            currentFilter = type;

            for (const [buttonType, buttonEl] of Object.entries(filterButtons)) {
                buttonEl.classList.toggle(
                    "active",
                    buttonType === currentFilter
                );
            }

            renderLabels();
        };

        filterButtons[type] = button;

        filter.appendChild(button);
    }


    filterButtons.all.classList.add("active");


    // List
    let list = createNewElement("div", {
        className: "goto-label-list"
    });

    let header = createNewElement("div", {
        className: "goto-label-header"
    });
    header.appendChild(search);
    header.appendChild(filter);
    content.appendChild(header);
    content.appendChild(list);


    // ------------------------------------------------------------
    // Render
    // ------------------------------------------------------------

    function renderLabels() {

        list.replaceChildren();

        let searchText = search.value.toLowerCase().trim();


        for (const item of labels) {

            if (currentFilter !== "all" &&
                item.type !== currentFilter) {
                continue;
            }

            if (searchText &&
                !item.label.toLowerCase().includes(searchText)) {
                continue;
            }


            let row = createNewElement("div", {
                className: "goto-label-row", styles:{cursor:"default", paddingTop:'2px'}
            });


            let label = createNewElement("span", {
                className: "goto-label-name"
            });

            label.textContent = item.label;


            let address = createNewElement("span", {
                className: "goto-label-address"
            });

            address.textContent =
                item.address.toString(16).padStart(4, "0").toUpperCase();


            row.appendChild(label);
            row.appendChild(address);


            row.onclick = () => {

                gotoDisasmAddress(item.address);

                //closeGotoLabelModal();
            };


            list.appendChild(row);
        }
    }


    search.oninput = renderLabels;


    renderLabels();


    // ------------------------------------------------------------
    // Show modal
    // ------------------------------------------------------------
    window.goto_label_modal.setBody(content);
    window.goto_label_modal.mount();
    window.goto_label_modal.open();
    /*showModal({
        title: "Goto label",
        content: content
    });*/
}