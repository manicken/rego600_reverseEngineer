

function openSettings() {
    let content = createNewElement("div", {
        className:"settings-form-content"
    });
    let use_realTimeThrottle_container_el = createNewElement("div", {className:"panel"});
    let use_realTimeThrottle_tooltip = "Run the simulator in real 11.0592 MHz / 80C552-speed. Uncheck to use max speed (Turbo).";
    let use_realTimeThrottle_chk = getCheckBoxWithLabel("Enable Realtime Throttle", use_realTimeThrottle_tooltip);
    use_realTimeThrottle_chk.input_el.checked = cpu.isRealtime;
    use_realTimeThrottle_chk.input_el.onchange = () => {
        cpu.isRealtime = use_realTimeThrottle_chk.input_el.checked;
    };
    use_realTimeThrottle_container_el.appendChild(use_realTimeThrottle_chk.label_el);
    content.appendChild(use_realTimeThrottle_container_el);

    let speed_multipler_input_container_el = createNewElement("div", {className:"panel"});
    content.appendChild(speed_multipler_input_container_el);
    let speed_multipler_input_el = appendInputFieldWithLabel(speed_multipler_input_container_el, {labelText:"Speed Multipler:", type:"number", min:0.001, step:0.01, styles:{width:'56px'}});
    speed_multipler_input_el.value = (this.speed_multipler?this.speed_multipler:1.0);
    speed_multipler_input_el.onchange = () => {
        cpu.speed_multipler = parseFloat(speed_multipler_input_el.value);
    };
        
    let rtc_use_system_clock_container_el = createNewElement("div", {className:"panel"});
    let rtc_use_system_clock_tooltip = 
        "When checked the RTC is updated using the System Clock,\n" + 
        "this makes it impossible to set the time from witchin the simulation,\n" +
        "uncheck to make it fully simulated,\nwhen unchecked the time can be set.";
    let rtc_use_system_clock_chk = getCheckBoxWithLabel("RTC: Use System Clock", rtc_use_system_clock_tooltip);
    rtc_use_system_clock_chk.input_el.checked = rtc.useSystemTime;
    rtc_use_system_clock_chk.input_el.onchange = () => {
        rtc.useSystemTime = rtc_use_system_clock_chk.input_el.checked;
    };
    rtc_use_system_clock_container_el.appendChild(rtc_use_system_clock_chk.label_el);
    content.appendChild(rtc_use_system_clock_container_el);

    window.settings_modal.setBody(content);
    window.settings_modal.mount();
    window.settings_modal.open();
}