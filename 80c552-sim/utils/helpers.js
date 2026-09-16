function parseNumber(v)
{
    v = v.trim();

    if(v.startsWith("0x") || v.startsWith("0X"))
        return parseInt(v, 16);

    return parseInt(v, 10);
}

function hex(v, w = 2, prefix=true) { return (prefix?'0x':'') + v.toString(16).toUpperCase().padStart(w, '0'); }

function getBytesInAsciiHex(bytes, separator=' ') {
    let ret = "";
    for (let i=0;i<bytes.length;i++) {
        if (i>0) { ret += separator; }
        ret += hex(bytes[i]);
    }
    return ret;
}

function printPrintable(value, nonPrintableAsHex=false) {
    if (value < 0x20) { return nonPrintableAsHex?("["+hex(value,false)+"]"):'.'; }
    return String.fromCharCode(value);
}


function pinNameToStruct(pinName) {
    const match = /^P(\d+)\.(\d+)$/.exec(pinName);

    if (!match)
        throw new Error(`Invalid pin name: ${pinName}`);

    const port = cpu[`P${match[1]}`];
    const bit = Number(match[2]);

    if (!port)
        throw new Error(`Port P${match[1]} does not exist`);

    if (bit < 0 || bit > 7)
        throw new Error(`Invalid bit number: ${bit}`);

    return { port, bit };
}

function dumpHex(bytes, bytesPerLine = 32) {
	let dumpText = "";
    for (let i = 0; i < bytes.length; i += bytesPerLine) {
        let line = Array.from(bytes.slice(i, i + bytesPerLine))
            .map(b => "0x" + b.toString(16).toUpperCase().padStart(2, "0"))
            .join(", ");
		dumpText += line + ",\n";
        //console.log(line + ",");
    }
	console.log(dumpText);
}


async function sha256(data) {
    const bytes = data instanceof Uint8Array
        ? data
        : new Uint8Array(data);

    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function printHashAsync(bytes) {
  const hash = await sha256(bytes);
  const hashString = hex(hash, 32, false);
  console.log("file save hash: " + hashString);
  log("file save hash: " + hashString);
}