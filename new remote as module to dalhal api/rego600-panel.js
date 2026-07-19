/**
 * rego600-panel.js — the "formdata" for the heat pump front panel.
 *
 * Everything device-specific lives here: register addresses, which
 * button sends what, the LCD widget, the encoder animation. To change
 * what a button does, edit REGO600_CONTROLS or rego600Dispatch below —
 * nothing in modal.js or control-panel.js needs to change.
 *
 * To reuse this pattern for something else (e.g. WiFi settings):
 * copy this file's shape — a CONTROLS array + a dispatch(action, control)
 * function — and pass them into a new Modal/ControlPanel pair.
 */

const REGO600_CONTROLS = [
	{
		id: "btn-1",
		type: "button",
		label: "1",
		style: { top: "586px", left: "397px", width: "60px", height: "60px", borderRadius: "30px" },
		action: { type: "frontPanelSetRegister", reg: 0x09, value: 0x01 },
	},
	{
		id: "btn-2",
		type: "button",
		label: "2",
		style: { top: "586px", left: "513px", width: "60px", height: "60px", borderRadius: "30px" },
		action: { type: "frontPanelSetRegister", reg: 0x0a, value: 0x01 },
	},
	{
		id: "btn-3",
		type: "button",
		label: "3",
		style: { top: "586px", left: "628px", width: "60px", height: "60px", borderRadius: "30px" },
		action: { type: "frontPanelSetRegister", reg: 0x0b, value: 0x01 },
	},
	{
		id: "btn-pwr",
		type: "button",
		label: "on/off",
		style: { top: "151px", left: "624px", width: "66px", height: "66px", borderRadius: "30px" },
		action: { type: "frontPanelSetRegister", reg: 0x08, value: 0x01 },
	},
	{
		id: "btn-left",
		type: "button",
		label: "\u2190",
		style: { top: "393px", left: "100px", width: "124px", height: "124px", borderRadius: "40px" },
		action: { type: "encoder", dir: "prev" },
	},
	{
		id: "btn-right",
		type: "button",
		label: "\u2192",
		style: { top: "393px", left: "240px", width: "124px", height: "124px", borderRadius: "40px" },
		action: { type: "encoder", dir: "next" },
	},
	{
		id: "btn-request-lcd-data",
		type: "button",
		label: "get LCD",
		style: { top: "40px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "getLcd" },
	},
	{
		id: "btn-request-meny-data",
		type: "button",
		label: "get meny",
		style: { top: "62px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "requestMenySelectedRegister" },
	},
	{
		id: "btn-set-timeout-max",
		type: "button",
		label: "set timeout2max",
		style: { top: "84px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "setRegister", reg: 0x436, value: 0xFFFF },
	},
	{
		id: "btn-set-meny-5_12",
		type: "button",
		label: "set meny 5.12",
		style: { top: "106px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "setRegister", reg: 0x447, value: 0x2c9c },
	},
	{
		id: "btn-set-access-kund1",
		type: "button",
		label: "set kund1 access",
		style: { top: "128px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "setRegister", reg: 0x7b95, value: 0x1 },
	},
	{
		id: "btn-set-access-kund2",
		type: "button",
		label: "set kund2 access",
		style: { top: "150px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "setRegister", reg: 0x7b95, value: 0x2 },
	},
	{
		id: "btn-set-access-service",
		type: "button",
		label: "set service access",
		style: { top: "172px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "setRegister", reg: 0x7b95, value: 0x4 },
	},
	{
		id: "btn-set-access-fabric",
		type: "button",
		label: "set fabric access",
		style: { top: "194px", left: "0px", width: "150px", height: "20px",border:"solid 1px", "background-color":"#FFFFFF", color:"#000000" },
		action: { type: "setRegister", reg: 0x7b95, value: 0x8 },
	},
	{
    id: "lcd-current-menu-data",
    type: "custom",
    label: "current menu data (0x447)",
    def: "hp",
    style: { top: "0px", left: "250px", width: "124px", height: "32px" },
    render: (control) => {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";

      const label = document.createElement("label");
      label.htmlFor = control.id;
      label.textContent = control.label;

      const input = document.createElement("input");
      input.id = control.id;
      input.type = "text";
      input.value = control.def;

      container.appendChild(label);
      container.appendChild(input);

      return container;
    },
  },
  {
    id: "lcd-current-menu-data2",
    type: "custom",
    label: "current menu data (0x446)",
    def: "hp",
    style: { top: "0px", left: "125px", width: "124px", height: "32px" },
    render: (control) => {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";

      const label = document.createElement("label");
      label.htmlFor = control.id;
      label.textContent = control.label;

      const input = document.createElement("input");
      input.id = control.id;
      input.type = "text";
      input.value = control.def;

      container.appendChild(label);
      container.appendChild(input);

      return container;
    },
  },
  {
    id: "lcd-current-menu-data3",
    type: "custom",
    label: "current menu data (0x448)",
    def: "hp",
    style: { top: "0px", left: "376px", width: "124px", height: "32px" },
    render: (control) => {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";

      const label = document.createElement("label");
      label.htmlFor = control.id;
      label.textContent = control.label;

      const input = document.createElement("input");
      input.id = control.id;
      input.type = "text";
      input.value = control.def;

      container.appendChild(label);
      container.appendChild(input);

      return container;
    },
  },
	{
		id: "encoder",
		type: "sprite",
		// One sprite sheet instead of 12 separate step-NN.png uploads.
		// Lay the sheet out as a 12-frame horizontal strip, 124x124 per frame
		// (adjust `columns` if you'd rather use a grid to keep the sheet's
		// aspect ratio sane).
		src: "encoder-sprite.png",
		frameWidth: 72,
		frameHeight: 73,
		columns: 12,
		frame: 0, // step 1 == frame index 0
		style: { top: "393px", left: "168px", width: "124px", height: "124px"  },
		// No action — it's a display, driven by the encoder buttons above.
	},
	{
		id: "lcd-text",
		type: "custom",
		style: { top: "400px", left: "350px" },
		render: (control) => {
			const div = document.createElement("div");
			div.id = control.id; // CharLCD library targets this by id
			return div;
		},
	},
	{
    id: "dalhal_uid",
    type: "custom",
    label: "dalhal uid",
    def: "hp",
    style: { top: "0px", left: "0px", width: "124px", height: "32px" },
    render: (control) => {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";

      const label = document.createElement("label");
      label.htmlFor = control.id;
      label.textContent = control.label;

      const input = document.createElement("input");
      input.id = control.id;
      input.type = "text";
      input.value = control.def;

      container.appendChild(label);
      container.appendChild(input);

      return container;
    },
  }
];

const REGO600_ENCODER_MAX_STEPS = 12;
let rego600EncoderFrame = 0; // 0-based index into the sprite sheet
 
function rego600NextEncoderFrame() {
	rego600EncoderFrame = (rego600EncoderFrame + 1) % REGO600_ENCODER_MAX_STEPS;
	return rego600EncoderFrame;
}
 
function rego600PrevEncoderFrame() {
	rego600EncoderFrame = (rego600EncoderFrame - 1 + REGO600_ENCODER_MAX_STEPS) % REGO600_ENCODER_MAX_STEPS;
	return rego600EncoderFrame;
}


/**
 * The dispatcher. This is the one place that translates declarative
 * control actions into the comms calls defined in main.js. Add a new
 * `case` here whenever you add a new action type to REGO600_CONTROLS.
 */
function makeRego600Dispatcher(panel) {
	return function rego600Dispatch(action, control) {
		switch (action.type) {
			case "frontPanelSetRegister":
			  
				REGO600_FrontPanelSet(action.reg, action.value);
				break;
				
			case "getRegister":
			  
				REGO600_RegisterGet(action.reg);
				break;
				
			case "setRegister":
			  
				REGO600_RegisterSet(action.reg, action.value);
				break;
				
			case "getLcd":
			  
				REGO600_requestLCD();
				break;

			case "encoder": {
			  
				const frame = action.dir === "next" ? rego600NextEncoderFrame() : rego600PrevEncoderFrame();
				panel.updateSprite("encoder", frame);
				REGO600_FrontPanelSet(0x44, action.dir === "next" ? 0x01 : 0x1fffff);
				break;
			}
			
			case "requestMenySelectedRegister": {
			  REGO600_requestMenySelectedRegister447()
			  break;
			}

			case "wsCmd":
				REGO600_ws_send_cmd(action.cmd);
				break;

			default:
				console.warn("rego600Dispatch: unhandled action type", action);
		}
	};
}

let rego600Modal;
let rego600Panel;
let rego600LcdText;
let rego600Dispatch; // assigned inside createRego600ControlModal, once the panel exists

function createRego600ControlModal() {
	rego600Panel = new ControlPanel({
		controls: REGO600_CONTROLS,
		background: "interface-bg.jpg",
		width: 800,
		height: 872,
		className: "rego600-panel",
		onAction: (action, control) => rego600Dispatch(action, control),
	});

	// The dispatcher needs a reference to the panel (to update the encoder
	// image), so it's created after the panel and closed over it.
	rego600Dispatch = makeRego600Dispatcher(rego600Panel);

	rego600Modal = new Modal({
		id: "rego600-modal",
		title: "REGO600 Control Panel",

	});
	rego600Modal.setBody(rego600Panel.el);
	rego600Modal.mount();
	rego600Modal.open();

	// CharLCD needs the target element in the DOM, which only happens
	// once the panel above has been built and mounted.
	rego600LcdText = new CharLCD({
		at: "lcd-text",
		rows: 4,
		cols: 20,
		rom: "eu",
		pix: 2,
		brk: 1,
		off: "#62a3ff",
		on: "#d4def4",
	});
	rego600LcdText.font(0, [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	rego600LcdText.font(1, [0x00, 0x18, 0x18, 0x18, 0x1f, 0x18, 0x18, 0x18]);
	rego600LcdText.font(2, [0x00, 0x1c, 0x1c, 0x1c, 0x1f, 0x1c, 0x1c, 0x1c]);
	rego600LcdText.font(3, [0x00, 0x1e, 0x1e, 0x1e, 0x1f, 0x1e, 0x1e, 0x1e]);
	rego600LcdText.font(4, [0x00, 0x0f, 0x0f, 0x0f, 0x1f, 0x0f, 0x0f, 0x0f]);
	rego600LcdText.font(5, [0x00, 0x07, 0x07, 0x07, 0x1f, 0x07, 0x07, 0x07]);
	rego600LcdText.font(6, [0x00, 0x03, 0x03, 0x03, 0x1f, 0x03, 0x03, 0x03]);
	rego600LcdText.font(7, [0x00, 0x01, 0x01, 0x01, 0x1f, 0x01, 0x01, 0x01]);
	rego600LcdText.font(8, [0x00, 0x10, 0x10, 0x10, 0x1f, 0x10, 0x10, 0x10]);
	rego600LcdText.font(9, [0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f]);
	rego600LcdText.font(0xff, [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

	// main.js's ws_rx_lcd_data_parse() writes into the module-level
	// `lcdText` variable — point it at this instance.
	lcdText = rego600LcdText;

	return { modal: rego600Modal, panel: rego600Panel };
}



document.addEventListener("DOMContentLoaded", () => {
	createRego600ControlModal();
});


function ws_rx_lcd_data_parse(data) {
	let lcdTextJoin = Object.values(data).join('\n');
	if (lcdTextJoin.trim().length == 0) lcdTextJoin = "(unit is turned off)";
	else {
		//lcdTextJoin = lcdTextJoin.replaceAll('ÿ','█');
		lcdTextJoin = lcdTextJoin.replaceAll('ß','°');
		
	}
	//console.log(lcdTextJoin);
	console.log(
  [...lcdTextJoin]
    .map(c => {
      const code = c.charCodeAt(0);
      return (code < 0x20 || code > 0x7E)
        ? `\\x${code.toString(16).padStart(2, "0")}`
        : c;
    })
    .join("")
);
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
	lcdTextJoin = lcdTextJoin.replaceAll('\uC3BF','\x09');
	lcdText.text(0, 0, lcdTextJoin);
}

customParsers.push((tag, text) => {
    if (tag == "rego600/systemregister/write") {
      let data = JSON.parse(text);
      const regIndexValue = parseInt(data.regIndex, 16);
      if (regIndexValue >= 0x7b65/*0x8*/ && regIndexValue <= 0x7b68/*0xB*/ || regIndexValue == 0x7ba1/*0x44*/) {
        REGO600_requestLCD();
        return true;
      } else {
        console.log("unhandled regIndexValue:" + regIndexValue);
      }
    } else if (tag == "rego600/systemregister/read") {
       let data = JSON.parse(text);
       const regIndexValue = parseInt(data.regIndex, 16);
       if (regIndexValue == 0x447) {
        document.getElementById("lcd-current-menu-data").value = data.hex;
        REGO600_requestMenySelectedRegister446();
        return true;
       } else if (regIndexValue == 0x446) {
        document.getElementById("lcd-current-menu-data2").value = data.hex;
        //REGO600_requestMenySelectedRegister448();
        return true;
       } else if (regIndexValue == 0x448) {
        document.getElementById("lcd-current-menu-data3").value = data.hex;
        
        return true;
       }
    } else if (tag == "rego600/lcd") {
      let data = JSON.parse(text);
      ws_rx_lcd_data_parse(data.lines);
      
      REGO600_requestMenySelectedRegister447();
      return true;
    }
    return false;
});


function REGO600_getUID()
{
    return document.getElementById("dalhal_uid").value;
}

const SYSREG_BASE      = 0x12EC;
const REGO_REG_BASE    = 0x10000 + 0x09A6;


function REGO600_FrontPanelSet(regIndex, value) {
  const index = ((REGO_REG_BASE + (regIndex << 1)) - SYSREG_BASE) >> 1;

  wsSend(`hal/write/string/${REGO600_getUID()}#sysreg/${index}/${value}`);
}

function REGO600_requestLCD() {
  wsSend(`hal/read/string/${REGO600_getUID()}#lcd`);
}

function REGO600_requestMenySelectedRegister446() {
  wsSend(`hal/read/string/${REGO600_getUID()}#sysreg/0x446`);
}

function REGO600_requestMenySelectedRegister447() {
  wsSend(`hal/read/string/${REGO600_getUID()}#sysreg/0x447`);
}
function REGO600_requestMenySelectedRegister448() {
  wsSend(`hal/read/string/${REGO600_getUID()}#sysreg/0x448`);
}

function REGO600_RegisterGet(regIndex) {
  wsSend(`hal/read/string/${REGO600_getUID()}#sysreg/${regIndex}`);
}

function REGO600_RegisterSet(regIndex, value) {
  wsSend(`hal/write/string/${REGO600_getUID()}#sysreg/${regIndex}/${value}`);
}

registerToolbarButton(
    "REGO600 remote control",
    () => rego600Modal.open(),
    "open-wifi-modal-btn"
);

