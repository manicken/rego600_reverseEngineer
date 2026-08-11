function Inverter(inputPortAndPin) {
    this.input = inputPortAndPin;

    this.get = function () {
        return readPortPin(this.input);
    };
}