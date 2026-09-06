
window.app.sim = window.app.sim?window.app.sim:{};
window.app.sim.frontPanel = { debugPrintI2C_write: false};

function init_front_panel(container_id) {
    let container = document.getElementById(container_id);
    container.style.flex = '1';
    container.style.maxWidth = '260px';
    appendH2_from_data_title(container);
    if (container.dataset.title2) { appendH2(container, container.dataset.title2); }
    let led_row_el = appendDiv(container, "row rego-led-row");

    appendOneLedControl(led_row_el, "power", "POWER");
    appendOneLedControl(led_row_el, "pump", "PUMP");
    appendOneLedControl(led_row_el, "addheat", "ADD HEAT");
    appendOneLedControl(led_row_el, "warmwater", "WARM WATER");
    appendOneLedControl(led_row_el, "alarm", "ALARM");
    appendRealFrontPanelButton(container, "Power", 5);
    
    window.app.sim.frontPanel.lcd = new CharLCDSim({container, chargen:lcd_sim_chargen, rows:4, columns:20/*, pixelsize:1,*/ /*, imageRendering: 'pixelated'*/});

    let button_row = appendDiv(container, "row rego-button-row");
    appendRealFrontPanelButton(button_row, "Left", 4);
    appendRealFrontPanelButton(button_row, "Middle", 3);
    appendRealFrontPanelButton(button_row, "Right", 2);
    appendBr(container);
    appendBr(container);
    appendButton(container, "Rotate Left").onclick = front_panel_wheel_left;
    appendButton(container, "Rotate Right").onclick = front_panel_wheel_right;
    
    init_and_attach_front_panel_to_i2c_bus();

}

function init_and_attach_front_panel_to_i2c_bus() {
    i2cBus.attach(0x08, {
	  start(isRead) { 
	    if (isRead) {
		    /*console.log("i2c start read");*/
			currentReadIndex=0;
      
		} 
		else {
      //front_panel_state_byte_A = 0x00;
      //front_panel_state_byte_B = 0x00;
			currentWriteIndex = 0;
			current_i2c_write = [];
		}
		return true;
	  },      // ACK/NACK
	  write(databyte)   { // master -> slave
      //
	    if (currentWriteIndex == 0) { lcd_row = databyte; }
		  else if (currentWriteIndex == 1) { lcd_col = databyte; }
		  //else if (currentWriteIndex == 2) { lcd_data.rows[lcd_row-1].cols[lcd_col-1] = databyte; }
      else if (currentWriteIndex == 2) { lcd_char_data = databyte;  }
      else if (currentWriteIndex == 3) {
        fp_i2c_byte_4 = databyte;
        updateLeds();
      }
      else if (currentWriteIndex == 4) {
        fp_i2c_byte_5 = databyte;
        updateLeds();
        window.app.sim.frontPanel.lcd.renderChar(lcd_char_data, lcd_row-1, lcd_col-1);
      }
		  current_i2c_write[currentWriteIndex] = databyte;
      currentWriteIndex++;
      return true;
	  }, 
	  read() { // master reads slave 
      let retVal = 0x00;
      if (currentReadIndex==0) {
        currentReadIndex = 1;
        
        retVal = front_panel_state_byte_A;
        if ((front_panel_state_byte_A & 0x01) === 0x01) { // wheel event
          front_panel_state_byte_A = 0x00;
        } else if ((front_panel_state_byte_A & 0x7C) !== (front_panel_state_byte_B & 0x7C)) {
          front_panel_state_byte_A = 0x00;
        } 
        
        
        //console.log("i2c read A:" + hex(retVal));
        //console.log("i2c read A:\n"+cpu.getCallStackString());
      } else if (currentReadIndex==1) {
        currentReadIndex = -1;
        retVal = front_panel_state_byte_B;
        if ((front_panel_state_byte_B & 0x83) !== 0) {
          front_panel_state_byte_B = 0x00;
        }
        //console.log("i2c read B:" + hex(front_panel_state_byte_B));
        //console.log("i2c read B:\n"+cpu.getCallStackString());

      }
      else {
        //console.log("i2c read ?:\n"+cpu.getCallStackString());

      }
      return retVal;

    },
	  stop()        { 
      logI2C_write();
      return true;
	  }
	});
}

let ascii_translate_table = {
  
  0xE1:'ä'.charCodeAt(0),
  0xE2:'å'.charCodeAt(0),
  0xF3:'ö'.charCodeAt(0),
  0xDF:'°'.charCodeAt(0),
  
  0x08:'▏'.charCodeAt(0),
  0x01:'▎'.charCodeAt(0),
  0x02:'▍'.charCodeAt(0),
  0x03:'▋'.charCodeAt(0),
  0xFF:'█'.charCodeAt(0),
};

function appendRealFrontPanelButton(container, label, index) {
    let btn_el = appendButton(container, label);
    btn_el.onpointerdown = (e) => {
        btn_el.setPointerCapture(e.pointerId);
        buttonPressed(index);
    };
    btn_el.onpointerup = (e) => {
        buttonReleased(index);
    };
    btn_el.onpointercancel = (e) => {
        buttonReleased(index);
    };
}

function appendOneLedControl(container, id, label) {
    let led_el = appendDiv(container, "rego-led", `led-${id}`);
    let led_icon_el = document.createElement("span");
    led_icon_el.className = "led";
    let led_label_el = document.createElement("span");
    led_label_el.className = "label";
    led_label_el.textContent = label;
    led_el.appendChild(led_icon_el);
    led_el.appendChild(led_label_el);
    return led_el;
}

let fp_i2c_byte_4 = 0;
let fp_i2c_byte_5 = 0;
function setLed(name, enabled, blink) {
    const element = document.getElementById(`led-${name}`);

    element.classList.toggle("on", enabled);
    element.classList.toggle("blink", enabled && blink);
}

const BYTE4_BITS = {
    led_pump:           0x02,
    led_power:          0x04,
    led_warmwater:      0x08,
    led_alarm:          0x10,
    led_addheat:        0x20,   
    lcd_backlight:      0x40,
    lcd_char_table_alt: 0x80,
}

const BYTE5_BITS = {
    led_blink_pump:         0x02, // dont know if this works, need to be verified by sending data to a real front panel
    led_blink_power:        0x04, // this can blink
    led_blink_warmwater:    0x08, // this can blink
    led_blink_alarm:        0x10, // this can blink
    led_blink_addheat:      0x20, // dont know if this works, need to be verified by sending data to a real front panel   
    lcd_blink_backlight:    0x40, // dont know if this works, need to be verified by sending data to a real front panel
}

function updateLeds() {

    setLed("power",
        (fp_i2c_byte_4 & BYTE4_BITS.led_power) !== 0,
        (fp_i2c_byte_5 & BYTE5_BITS.led_blink_power) !== 0
    );

    setLed("pump",
        (fp_i2c_byte_4 & BYTE4_BITS.led_pump) !== 0,
        (fp_i2c_byte_5 & BYTE5_BITS.led_blink_pump) !== 0,
    );

    setLed("addheat",
        (fp_i2c_byte_4 & BYTE4_BITS.led_addheat) !== 0,
        (fp_i2c_byte_5 & BYTE5_BITS.led_blink_addheat) !== 0,
    );

    setLed("warmwater",
        (fp_i2c_byte_4 & BYTE4_BITS.led_warmwater) !== 0,
        (fp_i2c_byte_5 & BYTE5_BITS.led_blink_warmwater) !== 0
    );

    setLed("alarm",
        (fp_i2c_byte_4 & BYTE4_BITS.led_alarm) !== 0,
        (fp_i2c_byte_5 & BYTE5_BITS.led_blink_alarm) !== 0
    );

    window.app.sim.frontPanel.lcd.setBacklight((fp_i2c_byte_4 & BYTE4_BITS.lcd_backlight) === 0);
}

let current_i2c_write = [];
let currentWriteIndex = 0;

let lcd_data_bytes = [];
let lcd_char_data = 0x20;
let lcd_row = 0;
let lcd_col = 0;

let currentReadIndex = 0;
let front_panel_state_byte_A = 0x00;
let front_panel_state_byte_B = 0x00;

function buttonPressed(bit) {

    front_panel_state_byte_A |= (1 << bit);
    front_panel_state_byte_B |= (1 << bit);

    //console.log("buttonPressed: " + bit + ", new state byte A:" + hex(front_panel_state_byte_A) + ", new state byte B:" + hex(front_panel_state_byte_B));
}

function buttonReleased(bit) {
  
    //front_panel_state_byte_A &= ~(1 << bit); // resets when reading i2c
    front_panel_state_byte_B &= ~(1 << bit);
    //console.log("buttonReleased: " + bit + ", new state byte A:" + hex(front_panel_state_byte_A) + ", new state byte B:" + hex(front_panel_state_byte_B));
}

function front_panel_wheel_left() {
  front_panel_state_byte_B = 0x81;
  front_panel_state_byte_A = 0x01;
}

function front_panel_wheel_right() {
  front_panel_state_byte_B = 0x01;
  front_panel_state_byte_A = 0x01;
}

function logI2C_write() {
  let databytes = "";
		for (let i=0;i<currentWriteIndex;i++) {
			if (i>0) { databytes += " "; }
			databytes += hex(current_i2c_write[i]);
		}
    if (databytes.length > 0 && window.app.sim.frontPanel.debugPrintI2C_write) {
		   console.log("i2c stop: " + databytes); 
    }
}

/*
      <div class="row" style="margin-top: 5px; margin-bottom: 5px; font-family: Arial, sans-serif;">
        <div class="rego-led" id="led-power">     <span class="led"></span> <span class="label">POWER</span> </div>
        <div class="rego-led" id="led-pump">      <span class="led"></span> <span class="label">PUMP</span> </div>
        <div class="rego-led" id="led-addheat">   <span class="led"></span> <span class="label">ADD HEAT</span> </div>
        <div class="rego-led" id="led-warmwater"> <span class="led"></span> <span class="label">WARM WATER</span> </div>
        <div class="rego-led" id="led-alarm">     <span class="led"></span> <span class="label">ALARM</span> </div>
      </div>
    
      <button id="front_panel_button_pwr" data-button-index="5">Power</button>
      <div class="lcd" id="lcd_data"></div>
      <div class="row" style="display:flex; justify-content: space-between;">
      <button id="front_panel_button_left" data-button-index="4">Left </button>
      <button id="front_panel_button_middle" data-button-index="3">Middle </button>
      <button id="front_panel_button_right" data-button-index="2">Right </button>
      </div>
      <br>
      <br>
      <button id="front_panel_wheel_left">Rotate Left</button>
      <button id="front_panel_wheel_right">Rotate Right</button>
*/