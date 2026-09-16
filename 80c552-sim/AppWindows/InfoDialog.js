class InfoDialog extends AppWindow {
    constructor({ title = "Info", message = "", buttonText = "OK", z=3000, onConfirm = () => {} } = {})
    {
        super({ title, height: 200, width: 350, backdrop: true, closeOnBackdropClick: false, z });
        this.setBody(createNewElement("div", { innerHTML: message, styles: { padding: "8px" } }));
        this.setFooter(createButtonBar([
            {
                text: buttonText,
                onClick: () => {
                    this.destroy();
                    onConfirm();
                }
            }
        ]));
        this.open();
    }
    static Show(p={}) {
        new InfoDialog(p);
    }
}

class NotImplementedMessageDialog {
    static Show() {
        console.trace("This function is not yes implemented");
        InfoDialog.Show({message:"This function is not yes implemented"});
    }
}

class CallBackNotSetDialog {
    static Show(name) {
        console.trace("the callback is not set: " + name);
        InfoDialog.Show({message:"the callback is not set: " + name});
    }
}
