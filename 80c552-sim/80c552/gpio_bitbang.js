/**
 * gpio_bitbang.js
 *
 * Firmware that bitbangs a protocol just does SETB/CLR/MOV on ordinary
 * port pins - there's no dedicated SFR to hook like ADCON or S1CON. The
 * trick is the same one used everywhere else in this package: attach to
 * setlistener (fires on every write to the port, i.e. every pin change)
 * to see output pins toggle, and to getlistener (fires on every read) to
 * inject a device's driven value into an input pin just before the CPU
 * samples it.
 *
 * IMPORTANT about getlistener: js51's reg.get() always returns `_value`
 * - a getlistener can't "return" an override, it has to mutate `_value`
 * in place before get() reads it back. drivePinInput() below does that.
 */

function watchPin(port, bit, { onRise, onFall, onChange } = {}) {
    port.setlistener.push((oldv, newv) => {
        const o = (oldv >> bit) & 1;
        const n = (newv >> bit) & 1;
        if (o === n) return;
        if (onChange) onChange(n, o);
        if (n === 1 && onRise) onRise();
        if (n === 0 && onFall) onFall();
    })
}
// Shared pins "just work": port.setlistener is a plain array, and every
// watchPin() call pushes its own closure onto it. Two devices watching
// the same {port, bit} - e.g. a DS1302's CE line doubling as a
// watchdog's strobe input - both get called on every edge of that pin,
// independently, in the order they were installed. No extra wiring
// needed: just pass the same {port, bit} object (or two objects with
// the same port/bit) to both install_*() calls.

function readPinLatch(port, bit) {
    return (port._value >> bit) & 1 // the pin's current output-latch bit, no listener side effects
}

function readPortPin(portPin) {
    return readPinLatch(portPin.port, portPin.bit);
}

/** Make `port` bit `bit` return whatever supplier() says on every read. */
function drivePinInput(port, bit, supplier) {
    port.getlistener.push(() => {
        const b = supplier() ? 1 : 0
        port._value = (port._value & ~(1 << bit)) | (b << bit)
    })
}
