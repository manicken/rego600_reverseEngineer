let expectedRxLenght = 0;
let currentRxCount = 0;
let currentRxBuff = [];
const rootURL = "<hiddenHost>"
//const webSocketURL = `wss://${rootURL}/rego600ws`
const webSocketURL = "wss://echo.websocket.org"

let outputElement = undefined;
let rxCountElement = undefined;
let currentDataType = undefined;
let currentDataName = "";

let lcdElement = undefined;

let lcdText = undefined;

let txBuffersToSend = [];
let txDataNames = [];
let currentTxBufferToSendCount = 0;

let ws;
let reconnectInterval = 1000; // start with 1 second

function connectWebSocket() {

	ws = new WebSocket(webSocketURL);
	//ws.binaryType = "arraybuffer";

	ws.onopen = () => {
		console.log("WebSocket connected");
		reconnectInterval = 1000; // reset backoff on success
		setTimeout(async () => {
		    ws_send_cmd("lcd");
		}, 500); // 500ms delay
	};

	ws.onmessage = ws_onmessage;

	ws.onclose = (event) => {
		console.warn("WebSocket closed:", event.reason);
		reconnectWebSocket();
	};

	ws.onerror = (error) => {
		console.error("WebSocket error:", error);
		ws.close(); // triggers onclose
	};
}

function reconnectWebSocket() {
    setTimeout(() => {
        console.log("Reconnecting WebSocket...");
        connectWebSocket();
        reconnectInterval = Math.min(reconnectInterval * 2, 10000); // exponential backoff (max 10s)
    }, reconnectInterval);
}

// Start the connection
connectWebSocket();


//ws.onopen = () => {
//    console.log("WebSocket connected");
//};
let lastActionWasInterfaceButtonPress = false;

function ws_onmessage(event) {
	if (lastActionWasInterfaceButtonPress) {
		lastActionWasInterfaceButtonPress = false;
		
		setTimeout(async () => {
			ws_send_cmd("lcd");
		}, 500); // 500ms delay
		
	}
	const data = event.data;

	if (typeof data === "string")
		ws_rx_json_string_data_parse(data);
	else if (data instanceof ArrayBuffer)
		ws_rx_binary_data_parse(data);
};

function ws_rx_json_string_data_parse(str) {
	var json = undefined;
	try {
		json = JSON.parse(str);
	} catch (err) {
		console.log(err, str);
		return;
	}
	if (json.debug != undefined) {
		console.warn("ws debug:" + JSON.stringify(json.debug));
	}
	else if (json.lcd != undefined) {
		//console.log("ws lcd data:" + JSON.stringify(json.lcd));
		ws_rx_lcd_data_parse(json.lcd);
	}
	else if (json.temperatures != undefined) {
		console.log("ws temperatures data:" + JSON.stringify(json.temperatures));
	}
	else if (json.states != undefined) {
		console.log("ws states data:" + JSON.stringify(json.states));
	}
	else if (json.error != undefined) {
		console.error("ws error:" + JSON.stringify(json.error));
	}
	else {
		console.log("ws unknown json string data rx:" + str);
	}
}

function ws_rx_lcd_data_parse(data) {
	let lcdTextJoin = Object.values(data).join('\n');
	if (lcdTextJoin.trim().length == 0) lcdTextJoin = "(unit is turned off)";
	else {
		//lcdTextJoin = lcdTextJoin.replaceAll('ÿ','█');
		lcdTextJoin = lcdTextJoin.replaceAll('ß','°');
		
	}
	console.log(lcdTextJoin);
	//outputElement.textContent = lcdTextJoin;
	//lcdElement.textContent = lcdTextJoin;
	// Map UNICODE string to the internal character set:
	lcdTextJoin = lcdTextJoin.replaceAll('\u2581','\x01');
	lcdTextJoin = lcdTextJoin.replaceAll('\u2582','\x02');
	lcdTextJoin = lcdTextJoin.replaceAll('\u2583','\x03');
	lcdTextJoin = lcdTextJoin.replaceAll('\u2584','\x04');
	lcdTextJoin = lcdTextJoin.replaceAll('\u2585','\x05');
	lcdTextJoin = lcdTextJoin.replaceAll('\u2586','\x06');
	lcdTextJoin = lcdTextJoin.replaceAll('\u2587','\x07');
	lcdTextJoin = lcdTextJoin.replaceAll('\u2588','\x08');
	lcdTextJoin = lcdTextJoin.replaceAll('ÿ','\x09');
	lcdText.text(0, 0, lcdTextJoin);
}

function ws_rx_binary_data_parse(data) {
	console.log("ws Binary data rx:",data);
	if (expectedRxLenght == -1) { // simple text
		outputElement.value += event.data;
	}
    else if (expectedRxLenght == 0) {
		const data = new Uint8Array(event.data);
		currentRxCount += data.length;
        const hex = [...data].map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        outputElement.value += hex + "\n";
        rxCountElement.textContent  = currentRxCount;
    }
    else {
		const data = new Uint8Array(event.data);
		currentRxCount += data.length;
        //console.log(data);
        currentRxBuff.push(...data);
        if (expectedRxLenght == currentRxCount) {
            const hex = [...currentRxBuff].map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            if (currentDataType == undefined)
                outputElement.value += hex + "\n";
            else if (currentDataType == "text") {
                // TODO decode lcd data here
                let text = "";
                for (let i=1;i<41;i+=2) {
                    text += String.fromCharCode(currentRxBuff[i]*16 + currentRxBuff[i+1]);
                }
                outputElement.value += currentDataName + ":" + text + "\n";
            }
            else if (currentDataType == "value") {
                let value = (currentRxBuff[1] << 14) + (currentRxBuff[2] << 7) + currentRxBuff[3];
                outputElement.value += currentDataName + ": " + (value/10).toString() + "\n";
            }
        }
    }
}


ws.onerror = (err) => {
    console.error("WebSocket error", err);
};

function GetAllTemperatures() {
	expectedRxLenght = -1; // prints any debug output from websocket
	
	fetch(`https://${rootURL}/Temperatures`)
		.then(res => res.json())
		.then(data => {
			PrintAllTemperatures(data);
		})
		.catch(err => {
			console.error("Fetch error:", err);
			outputElement.value += "Failed to get temperatures.\n";
		});
}

let tempNameTable = {
	GT1:"element retur",
	GT2:"utomhus",
	GT3:"varmvatten",
	GT5:"inomhus",
	GT6:"kompressor",
	GT8:"värmebärare ut",
	GT9:"värmebärare retur",
	GT10:"köldbärare in",
	GT11:"köldbärare ut",
}

function PrintAllTemperatures(json) {
	let str = "Temperaturer:\n";
	let keys = Object.keys(json);

	for (let key of keys) {
		str += `${json[key]}° : ${tempNameTable[key]} (${key})\n`;
	}

	outputElement.value += str;
}

function GetAllStates() {
	expectedRxLenght = -1; // prints any debug output from websocket
	fetch(`https://${rootURL}/States`)
		.then(res => res.json())
		.then(data => {
			PrintAllStates(data);
		})
		.catch(err => {
			console.error("Fetch error:", err);
			outputElement.value += "Failed to get states.\n";
		});
}

let stateNameTable = {
	P3:"kylbärarpump",
	COMP:"kompressor",
	EH3:"elpatron 3kw",
	EH6:"elpatron 6kw",
	P1:"extern pump",
	P2:"värmebärarpump",
	VXV:"växelventil (vv på)",
	ALARM:"alarm",
}

function PrintAllStates(json) {
	let str = "Tillstånd:\n";
	let keys = Object.keys(json);

	for (let key of keys) {
		str += `${json[key]?"aktiv":"inaktiv"} : ${stateNameTable[key]} (${key})\n`;
	}

	outputElement.value += str;
}

function sendInput() {
	
    const input = document.getElementById("hexInput").value;//.replace(/\s+/g, ' ');
    //if (!/^[0-9a-fA-F]*$/.test(input) || input.length % 2 !== 0) {
    //alert("Please enter a valid even-length hex string.");
    //return;
    //}
	console.log("sending:"+input);
    sendHex(input);
}

function FrontPanelSet(regAddr, value) {
	lastActionWasInterfaceButtonPress = true;
    const buffer = [0x81, 0x01];
    buffer.push((regAddr >> 14) & 0x7F);
    buffer.push((regAddr >> 7) & 0x7F);
    buffer.push(regAddr & 0x7F);
    buffer.push((value >> 14) & 0x7F);
    buffer.push((value >> 7) & 0x7F);
    buffer.push(value & 0x7F);
    expectedRxLenght = 0; // rx raw
    //currentDataType = "value";
    currentDataName = "";
    SendBuffer(buffer);
}

function GetReadRegister(regAddr,_currentDataName="")
{
    currentDataName = _currentDataName;
    const buffer = [0x81, 0x02];
    buffer.push((regAddr >> 14) & 0x7F);
    buffer.push((regAddr >> 7) & 0x7F);
    buffer.push(regAddr & 0x7F);
    buffer.push(0);
    buffer.push(0);
    buffer.push(0);
    expectedRxLenght = 5;
    currentDataType = "value";
    return buffer;
}
function SendBuffer(buffer) {
    buffer.push(CalcCheckSum(buffer));
    const hexStr = [...buffer].map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    console.log(hexStr);
    const _buffer = new Uint8Array(buffer);
    currentRxCount = 0;
    currentRxBuff = [];
    ws.send(_buffer);
}
function CalcCheckSum(buffer) {
    let chksum = 0;
    for (let i=2;i<buffer.length;i++)
        chksum ^= buffer[i];
    return chksum;
}

function sendHex(hexString, _expectedRxLenght, _currentDataType) {
    expectedRxLenght = (_expectedRxLenght!=undefined)?_expectedRxLenght:0;
    currentDataType = _currentDataType;
    currentRxBuff = [];
    currentRxCount = 0;
    //outputElement.value = "";
    rxCountElement.textContent  = "";

    // Split by spaces or commas, filter out empty strings
    const hexArray = hexString.split(/[\s,]+/)
        .map(h => h.trim())
        .filter(h => h.length > 0)
        .map(h => parseInt(h, 16))
        .filter(n => !isNaN(n) && n >= 0 && n <= 255); // only valid bytes

    const buffer = new Uint8Array(hexArray);
	console.log("ws.send:",hexString,hexArray,buffer);
    ws.send(buffer);
}

let lcdDemoText = {"1":"      Rego637     K1","2":"                    ","3":" 250528 10:17:10 On ","4":"Värme   Info    Meny"};

async function GetAndSetLCD()
{
	//let jsonCmd = JSON.stringify({cmd:"lcd"});
	//console.log("sending:" + jsonCmd);
	//ws.send(jsonCmd);
	try {
        const response = await fetch(`https://${rootURL}/LCD`, { method: 'GET' });
        const lcdTextData = await response.json();

        let lcdTextJoin = Object.values(lcdTextData).join('\n');
		if (lcdTextJoin.trim().length == 0) lcdTextJoin = "(unit is turned off)";
		console.log(lcdTextJoin);
		//lcdElement.textContent = lcdTextJoin;
		
    } catch (error) {
        console.error('Error in requests:', error);
    }
}

function InitMousePosDebugger() {
	const interfaceEl = document.querySelector('.interface');
	interfaceEl.addEventListener('mousemove', (event) => {
	  const rect = interfaceEl.getBoundingClientRect();

	  const x = event.clientX - rect.left;
	  const y = event.clientY - rect.top;

	  console.log(`Mouse X: ${x}, Mouse Y: ${y}`);
	});
}

var encoderCurrentStep = 0;
var currentStep = 1;
const maxSteps = 12;
const encoderImg = document.getElementById('encoder');

function EncoderNextStep()
{
	if (currentStep == maxSteps) currentStep = 1;
	else currentStep++;
	// Update image
	encoderImg.src = `encoder/step-${(currentStep<10)?("0"+currentStep):currentStep}.png`;
}
function EncoderPrevStep()
{
	if (currentStep == 1) currentStep = maxSteps;
	else currentStep--;

    // Update image
    encoderImg.src = `encoder/step-${(currentStep<10)?("0"+currentStep):currentStep}.png`;
}

document.addEventListener("DOMContentLoaded", async function () {
    outputElement = document.getElementById("outputLog");
    rxCountElement = document.getElementById("rxCount");
	//lcdElement = document.getElementById("lcd-display");
	
	//GetAndSetLCD();

	/*let currentStep = 0;
	

	document.querySelector('.encoder-container').addEventListener('wheel', (event) => {
	  event.preventDefault();

	  // Rotate up or down
	  if (event.deltaY < 0) {
		currentStep = (currentStep + 1) % maxSteps;
	  } else {
		currentStep = (currentStep - 1 + maxSteps) % maxSteps;
	  }
	  
	  let imgIndex = currentStep+1;;

	  // Update image
	  encoderImg.src = `encoder/step-${(imgIndex<10)?("0"+imgIndex):imgIndex}.png`;
	});*/
	
	document.getElementById('btn-1').addEventListener('click', (event) => {
		
		FrontPanelSet(0x09, 0x01);
	});
	document.getElementById('btn-2').addEventListener('click', (event) => {
		FrontPanelSet(0x0A, 0x01)
	});
	document.getElementById('btn-3').addEventListener('click', (event) => {
		FrontPanelSet(0x0B, 0x01)
	});
	document.getElementById('btn-pwr').addEventListener('click', (event) => {
		FrontPanelSet(0x08, 0x01);
	});
	document.getElementById('btn-left').addEventListener('click', (event) => {
		EncoderPrevStep();
		FrontPanelSet(0x44, 0x1FFFFF);
	});
	document.getElementById('btn-right').addEventListener('click', (event) => {
		EncoderNextStep();
		FrontPanelSet(0x44, 0x01);
	});

	addNewDebugButton("get lcd (http get req)", async function(event) {
		try {
			const response = await fetch(`https://${rootURL}/LCD`, { method: 'GET' });
			const lcdTextData = await response.json();

			let lcdTextJoin = Object.values(lcdTextData).join('\n');
			if (lcdTextJoin.trim().length == 0) lcdTextJoin = "(unit is turned off)";
			console.log(lcdTextJoin);
			//lcdElement.textContent = lcdTextJoin;
			
		} catch (error) {
			console.error('Error in requests:', error);
		}
	});
	
	addNewDebugButton("get lcd (websocket)", (event) => {
		ws_send_cmd("lcd");
	});
	addNewDebugButton("get temperatures (websocket)", (event) => {
		ws_send_cmd("temperatures");
	});
	addNewDebugButton("get states (websocket)", (event) => {
		ws_send_cmd("states");
	});
	
	lcdText = new CharLCD({ at: 'lcd-text', rows: 4, cols: 20, rom: 'eu', pix:2,brk:1, off:'#62a3ff',on:'#d4def4' });
	lcdText.font(0, [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]);
	lcdText.font(1, [0x00,0x18,0x18,0x18,0x1F,0x18,0x18,0x18]);
	lcdText.font(2, [0x00,0x1C,0x1C,0x1C,0x1F,0x1C,0x1C,0x1C]);
	lcdText.font(3, [0x00,0x1E,0x1E,0x1E,0x1F,0x1E,0x1E,0x1E]);
	lcdText.font(4, [0x00,0x0F,0x0F,0x0F,0x1F,0x0F,0x0F,0x0F]);
	lcdText.font(5, [0x00,0x07,0x07,0x07,0x1F,0x07,0x07,0x07]);
	lcdText.font(6, [0x00,0x03,0x03,0x03,0x1F,0x03,0x03,0x03]);
	lcdText.font(7, [0x00,0x01,0x01,0x01,0x1F,0x01,0x01,0x01]);
	lcdText.font(8, [0x00,0x10,0x10,0x10,0x1F,0x10,0x10,0x10]);
	lcdText.font(9, [0x1F,0x1F,0x1F,0x1F,0x1F,0x1F,0x1F,0x1F]);
});

function ws_send_cmd(cmdStr) {
	let jsonCmd = JSON.stringify({cmd:cmdStr});
	console.log("sending:" + jsonCmd);
	ws.send(jsonCmd);
}

function addNewDebugButton(label, click_cb) {
	// 1. Get the target element
	  const container = document.getElementById('debugButtons');

	  // 2. Create a button element
	  const button = document.createElement('button');
	  button.textContent = label;

	  // 3. Attach a click event listener to the button
	  button.addEventListener('click', click_cb);

	  // 4. Append the button to the container
	  container.appendChild(button);
}