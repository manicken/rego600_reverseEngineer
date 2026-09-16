
class InputDialog extends AppWindow {

    constructor({ title = "Input", message = "Enter Value: ", confirmText = "OK", value = "", enterConfirm=true, confirmClass = "", onValidate = (value) => { return true; }, onConfirm = (value) => {} } = {}) {
        super({ title, height: 200, width: 350, backdrop: true, closeOnBackdropClick: false});

        let body_el = createNewElement('div', {styles:{width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding:'8px'}})
        let message_el = createNewElement("div", { innerHTML: message, styles: { padding: "8px" } });
        let input_el = createNewElement('input', { type:"text" });
        let error_el = createNewElement('div', {styles:{display:'none', color:'#b40000'}});
        function validateAndConfirm() {
            let validationRes = onValidate(input_el.value); 
            if (validationRes !== true) {
                error_el.textContent = validationRes;
                error_el.style.display = '';
                //infoAppWindow({message:validationRes, z:3000});
                input_el.focus();
                return;
            }
            error_el.style.display = 'none';
            onConfirm(input_el.value);
            this.destroy();
        }
        if (enterConfirm == true) {
            input_el.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopPropagation();
                    validateAndConfirm();
                }
            });
        }
        input_el.value = value;
        body_el.appendChild(message_el);
        body_el.appendChild(input_el);
        body_el.appendChild(error_el);

        this.setBody(body_el);
        this.setFooter(createButtonBar([
            {
                text: confirmText,
                className: confirmClass,
                onClick: () => {
                    validateAndConfirm();
                }
            },
            {
                text: "Cancel",
                onClick: () => {
                    this.destroy();
                }
            }
        ]));
        this.open();
        input_el.focus();
    }

    static Show(p={}) {
        new InputDialog(p);
    }
}