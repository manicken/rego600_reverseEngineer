

function openSettings() {
    let content = createNewElement("div", {
        className:"settings-form-content"
    });

    let use_realTimeThrottle_container_el = createNewElement("div", {className:"panel"});
    content.appendChild(use_realTimeThrottle_container_el);
    let use_realTimeThrottle_tooltip = "Run the simulator in real 11.0592 MHz / 80C552-speed. Uncheck to use max speed (Turbo).";
    appendCheckBoxWithLabel(use_realTimeThrottle_container_el,
        { label: "Enable Realtime Throttle", tooltip: use_realTimeThrottle_tooltip, state: cpu.isRealtime.value, style: { marginLeft: "10px", marginBottom: "10px" } },
        (value) => {
            cpu.isRealtime.set(value);
        }
    );

    let speed_multipler_input_container_el = createNewElement("div", {className:"panel"});
    content.appendChild(speed_multipler_input_container_el);
    let speed_multipler_input_el = appendInputFieldWithLabel(speed_multipler_input_container_el, {labelText:"Speed Multipler:", type:"number", min:0.001, step:0.01, styles:{width:'56px'}});
    speed_multipler_input_el.value = cpu.speed_multipler.value;
    speed_multipler_input_el.onchange = () => {
        cpu.speed_multipler.set(parseFloat(speed_multipler_input_el.value));
    };
        
    // Live tracking checkbox
    let rtc_use_system_clock_container_el = createNewElement("div", {className:"panel"});
    content.appendChild(rtc_use_system_clock_container_el);
    let rtc_use_system_clock_tooltip = 
        "When checked the RTC is updated using the System Clock,\n" + 
        "this makes it impossible to set the time from witchin the simulation,\n" +
        "uncheck to make it fully simulated,\nwhen unchecked the time can be set.";
    appendCheckBoxWithLabel(rtc_use_system_clock_container_el,
        { label: "RTC: Use System Clock", tooltip: rtc_use_system_clock_tooltip, state: rtc.useSystemTime, style: { marginLeft: "10px", marginBottom: "10px" } },
        (value) => {
            rtc.useSystemTime = value;
            AppStorage.set('rtc.useSystemTime', value);
        }
    );

    // Live tracking checkbox
    let liveTracking_ToolTip = "Enable live tracing while the simulator runs, stepping however always use Tracking";
    appendCheckBoxWithLabel(content,
        { label: "Disassembly Live Tracking", tooltip: liveTracking_ToolTip, state: disasm.live_update.value, style: { marginLeft: "10px", marginBottom: "10px" } },
        (value) => {
            disasm.live_update.set(value);
        }
    );

    let autoscroll_ToolTip = "Enable live tracing scrolling while the simulator runs, stepping however always use Tracking";
    appendCheckBoxWithLabel(content,
        { label: "Disassembly Live Scroll", tooltip: autoscroll_ToolTip, state:  disasm.auto_scroll.value, style: { marginLeft: "20px", marginBottom: "10px" } },
        (value) => {
            disasm.auto_scroll.set(value);
        }
    );

    let lcdSim_enable_log_ToolTip = "Enable debugPrintRenderChar of lcd_sim,\nnote this is not a persistent setting";
    appendCheckBoxWithLabel(content,
        { label: "debugPrint LCD_sim RenderChar", tooltip: lcdSim_enable_log_ToolTip, state: window.app.sim.frontPanel.lcd.debugPrintRenderChar, style: { marginLeft: "20px", marginBottom: "10px" } },
        (value) => {
            // note this is not a persistent setting as it's only used temporarily  
            window.app.sim.frontPanel.lcd.debugPrintRenderChar = value;
        }
    );

    let front_panel_sim_rx_packet_enable_log_ToolTip = "Enable front_panel_sim_rx_packet_logging,\nnote this is not a persistent setting";
    console.log(window.app.sim.frontPanel.debugPrintI2C_write);
    appendCheckBoxWithLabel(content,
        { label: "front_panel_sim_rx_packet_logging", tooltip: front_panel_sim_rx_packet_enable_log_ToolTip, state: window.app.sim.frontPanel.debugPrintI2C_write, style: { marginLeft: "20px", marginBottom: "10px" } },
        (value) => {
            // note this is not a persistent setting as it's only used temporarily  
            window.app.sim.frontPanel.debugPrintI2C_write = value;
        }
    );

    window.app.settings_modal.setBody(content);
    window.app.settings_modal.mount();
    window.app.settings_modal.open();
}