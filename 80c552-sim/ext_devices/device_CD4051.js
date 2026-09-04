/**
 * Simulates an 74HC4051 / CD4051 8-channel analog multiplexer.
 *
 * A, B, C  = channel select
 * INH       = inhibit, active high
 * X[0..7]   = analog input channels
 * Z         = selected analog output
 */
function CD4051(pins, values=undefined, tag="") {
    const { A, B, C, INH } = pins;

    this.X = values?values:[0, 0, 0, 0, 0, 0, 0, 0];
    this.lastCh = 0;

    this.getChannel = function () {
        //console.log(`${readPortPin(A)} ${readPortPin(B)} ${readPortPin(C)}`);
        return readPortPin(A) |
              (readPortPin(B) << 1) |
              (readPortPin(C) << 2);
    };

    this.get = function () {
        if (readPortPin(INH))
            return 0;
        let currCh = this.getChannel();
        /*if (this.lastCh !== currCh) {
            console.log(`4051 ${tag} channel changed from ${this.lastCh} to ${currCh}`);
            this.lastCh = currCh;

        }*/
        return this.X[currCh];
    };
}