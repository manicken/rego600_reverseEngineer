/**
 * logging.js
 *
 * One generic way to see what firmware is actually sending to *any*
 * virtual device in this package - I2C slaves, DS1302, the 4094/4021
 * shift registers, the AM29F040/62256, the ADC - without adding
 * bespoke logging code to each of them.
 *
 * traceDevice() wraps an object in a Proxy that logs every method call
 * (arguments + return value) as it happens. Wrap the device *before*
 * handing it to install_*()/bus.attach() - everything downstream keeps
 * calling the same method names, so nothing else needs to change.
 *
 *   const eeprom = traceDevice(new RegisterAddressedDevice(256), "EEPROM@0x50");
 *   bus.attach(0x50, eeprom);
 *
 *   const ds = traceDevice(new DS1302(), "DS1302");
 *   install_ds1302(cpu, ds, { ce: {...}, sclk: {...}, io: {...} });
 *
 * Every call - including the low-level per-bit ones like sclkRise() on
 * DS1302 - gets logged, so a full I2C or bitbang transaction can be
 * noisy (one line per bit/byte). Use `only` to keep just the calls you
 * care about, e.g. `{ only: ["write", "read", "start"] }` to collapse
 * an I2C log down to byte-level traffic.
 */

function fmtVal(v) {
    if (typeof v === "number") return "0x" + (v >>> 0).toString(16).padStart(2, "0")
    if (typeof v === "boolean") return String(v)
    if (v === undefined) return "void"
    if (v instanceof Uint8Array) return `[${v.length} bytes]`
    return String(v)
}

/**
 * @param {Object} target  the device instance to wrap
 * @param {string} label   shown in every log line, e.g. "EEPROM@0x50"
 * @param {Object} [opts]
 * @param {(line:string)=>void} [opts.logger]  defaults to console.log
 * @param {string[]} [opts.only]  if given, only these method names are logged
 * @returns {Object} a Proxy behaving exactly like `target`
 */
function traceDevice(target, label, opts = {}) {
    const logger = opts.logger ?? console.log
    const only = opts.only ? new Set(opts.only) : null

    return new Proxy(target, {
        get(obj, prop, receiver) {
            const val = Reflect.get(obj, prop, receiver)
            if (typeof val !== "function" || prop === "constructor") return val
            if (only && !only.has(prop)) return val.bind(obj)

            return function (...args) {
                const result = val.apply(obj, args)
                const argStr = args.map(fmtVal).join(", ")
                logger(`[${label}] ${String(prop)}(${argStr}) -> ${fmtVal(result)}`)
                return result
            }
        },
    })
}

/** Convenience: collect log lines into an array instead of console.log. */
function makeLogBuffer() {
    const lines = []
    const logger = (line) => lines.push(line)
    return { lines, logger }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { traceDevice, makeLogBuffer }
}
