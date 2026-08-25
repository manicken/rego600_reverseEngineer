let default_entry_points = [
    {addr:0x0000, label:"reset", comment:"Program execution starts here."}, 
    {addr:0x000B, label:"TIMER0_IRQ_VECTOR"}, 
    {addr:0x0023, label:"UART_IRQ_VECTOR"},
    {addr:0x002B, label:"I2C_IRQ_VECTOR"},
];

let entry_points_3021 = [
    ...default_entry_points,
];

let entry_points_3060 = [
    ...default_entry_points,
    {addr:0x002E, label:"START_AFTER_RESET_VECTOR"}, 
    {addr:0x0136, label:"sensor_apply_gain_offset"},
    {addr:0x0160, label:"signed_divide_16bit_wrapper"},
    {addr:0x069E, label:"BY_CMD_DISPATCH_TABLE_LOOKUP"},
    {addr:0x0883, label:"ReadMemory_to_R5_R6_R7"},
    {addr:0x0889, label:"ReadSelectedMemoryType"},
    {addr:0x0A16, label:"SetupMemoryAccessAbsolute"},
    {addr:0x0A3A, label:"SetupMemoryAccessOffset"},
    {addr:0x0B5A, label:"intmem_read_3bytes_to_R5_R6_R7"},
    {addr:0x67D7, label:"extram_zerofill"}, 
    {addr:0x6829, label:"TIMER0_IRQ_HANDLER"}, 

    {addr:0x6869, label:"I2C_IRQ_HANDLER"},
    {addr:0x68EE, label:"i2c_status_08"},
    {addr:0x68FD, label:"i2c_status_10"},
    {addr:0x690C, label:"i2c_status_18"},
    {addr:0x691B, label:"i2c_status_20"},
    {addr:0x692D, label:"i2c_status_28"},
    {addr:0x6951, label:"i2c_status_30"},
    {addr:0x695C, label:"i2c_status_38"},
    {addr:0x696A, label:"i2c_status_40"},
    {addr:0x696F, label:"i2c_status_48"},
    {addr:0x697A, label:"i2c_status_50"},
    {addr:0x698C, label:"i2c_status_58"},
    {addr:0x69A7, label:"i2c_status_others"},
    {addr:0x69BA, label:"i2c_status_common_end"},

    {addr:0x6A42, label:"UART_RX_START_BYTE_CHECK"},
    {addr:0x6A6A, label:"UART_IRQ_HANDLER"},
    {addr:0x6B2C, label:"UART_SEND_ONE_BYTE"},

    {addr:0x6B48, label:"Read_DS1302_byte"}, // RTC
    {addr:0x6B72, label:"DS1302_BurstRead_DateTime"},
    {addr:0x6BF1, label:"DS1302_Write_Register_Byte"},
    {addr:0x6C6A, label:"DS1302_Read_Register_Byte"},
    {addr:0x6CB4, label:"DS1302_WriteTimeFromTemporary"},
    {addr:0x6CE2, label:"DS1302_RTC_init"},

    {addr:0x8919, label:"UART_SEND_AS_3_BYTES_PLUS_CHECKSUM"},
    {addr:0x8A81, label:"uart_cmd_01_front_panel_write"},
    {addr:0x8A9E, label:"uart_cmd_02_sys_reg_read"},
    {addr:0x8AB5, label:"uart_cmd_03_sys_reg_write"},
    {addr:0x8AE1, label:"uart_cmd_04_timer_reg_read"},
    {addr:0x8AFA, label:"uart_cmd_05_timer_reg_write"},
    {addr:0x8B16, label:"uart_cmd_06_menu_reg_read"},
    {addr:0x8B2E, label:"uart_cmd_07_menu_reg_write"},
    {addr:0x8B4A, label:"uart_cmd_20_display_reg_read"},
    {addr:0x8B5F, label:"uart_cmd_40_read_last_error_line"},
    {addr:0x8B73, label:"uart_cmd_42_read_prev_error_line"},
    {addr:0x8B87, label:"uart_cmd_7F_read_rego_ver"},
    {addr:0x8B90, label:"uart_cmd_reset_rx_index"},

    {addr:0x94C9, label:"menu_function_lockup"},
    {addr:0x952A, label:"menu_func_trampoline_00"},
    {addr:0x9530, label:"menu_func_trampoline_01"},
    {addr:0x953C, label:"menu_func_trampoline_04"},
    {addr:0x9542, label:"menu_func_trampoline_06"},
    {addr:0x9547, label:"menu_func_trampoline_07"},
    {addr:0x954C, label:"menu_func_trampoline_08"},
    {addr:0x9551, label:"menu_func_trampoline_09"},
    {addr:0x9556, label:"menu_func_trampoline_0A"},
    {addr:0x955B, label:"menu_func_trampoline_0B"},
    {addr:0x9560, label:"menu_func_trampoline_0E"},
    {addr:0x9565, label:"menu_func_trampoline_0F"},
    {addr:0x956A, label:"menu_func_trampoline_10"},
    {addr:0x956F, label:"menu_func_trampoline_11"},
    {addr:0x9574, label:"menu_func_trampoline_12"},
    {addr:0x9579, label:"menu_func_trampoline_13"},
    {addr:0x957E, label:"menu_func_trampoline_14"},
    {addr:0x9583, label:"menu_func_trampoline_15"},
    {addr:0x9588, label:"menu_func_trampoline_16"},
    {addr:0x958D, label:"menu_func_trampoline_17"},
    {addr:0x9592, label:"menu_func_trampoline_18"},
    {addr:0x959C, label:"menu_func_trampoline_19"},
    {addr:0x95A1, label:"menu_func_trampoline_1A"},
    {addr:0x95AB, label:"menu_func_trampoline_1B"},
    {addr:0x95B0, label:"menu_func_trampoline_1C"},
    {addr:0x95B5, label:"menu_func_trampoline_1D"},
    {addr:0x95BA, label:"menu_func_trampoline_1E"},
    {addr:0x95BF, label:"menu_func_trampoline_1F"},
    {addr:0x9597, label:"menu_func_trampoline_20"},
    {addr:0x95A6, label:"menu_func_trampoline_21"},
    {addr:0x9536, label:"menu_func_trampoline_2D"},
    {addr:0x95C6, label:"menu_func_trampoline_RET", comment:"just a simple ret"},

    {addr:0x95C7, label:"menu_func_00"},
    {addr:0x95F2, label:"menu_func_01"},
    {addr:0x9822, label:"menu_func_04_2D"},
    {addr:0x9AD6, label:"menu_func_06_07_10_11"},
    //{addr:0x9AD6, label:"menu_func_07"},
    {addr:0xA510, label:"menu_func_08"},
    {addr:0xA5B8, label:"menu_func_09"},
    {addr:0xA894, label:"menu_func_0A"},
    {addr:0xA902, label:"menu_func_0B_RTC_SET"},
    {addr:0xAE58, label:"menu_func_0E"},
    {addr:0xB5BE, label:"menu_func_0F"},
    //{addr:0x9AD6, label:"menu_func_10"},
    //{addr:0x9AD6, label:"menu_func_11"},
    {addr:0xB92F, label:"menu_func_12"},
    {addr:0xBBF3, label:"menu_func_13"},
    {addr:0xBEAC, label:"menu_func_14"},
    {addr:0xC3FD, label:"menu_func_15"},
    {addr:0xC476, label:"menu_func_16"},
    {addr:0xC6CC, label:"menu_func_17"},
    {addr:0xC9DC, label:"menu_func_18"},
    {addr:0xCAA2, label:"menu_func_19"},
    {addr:0xCB13, label:"menu_func_1A"},
    {addr:0xCB87, label:"menu_func_1B"},
    {addr:0xD46C, label:"menu_func_1C"},
    {addr:0xD836, label:"menu_func_1D_LOG_VIEW"},
    {addr:0xD22D, label:"menu_func_1E"},
    {addr:0xDA49, label:"menu_func_1F"},
    {addr:0xDD18, label:"menu_func_20"},
    {addr:0xDE23, label:"menu_func_21"},
    //{addr:0x9822, label:"menu_func_2D"},
];

let entry_points_3120 = [
    ...default_entry_points,
];

let firmware_profiles = [
    {
        version:"unknown", 
        entry_points: default_entry_points,
        indirect_jumps: [],
        adc_lookup_table_addr: 0xF700, // just somewhere where it could be
        adc_lookup_table_index_offset: 9,
        targets:["unknown"],
        hash:""
    },
    {
        version:"3.021",
        entry_points: entry_points_3021,
        indirect_jumps: new Set([]),
        adc_lookup_table_addr: 0xF79C,
        adc_lookup_table_index_offset: 9,
        targets:["rego634"],
        hash:"4AE4D6CE67A84CEE2CCC19738CF3BDD91D865238FE8DC4822DE0D291F5F4EA8B"
    },
    {
        version:"3.06",
        entry_points: entry_points_3060,
        indirect_jumps: new Set([0xB29, 0xB3B]),
        adc_lookup_table_addr: 0xF7C6,
        adc_lookup_table_index_offset: 9,
        targets:["rego637","rego637e"],
        hash:"BD8E616AE8F6B31BB731104EBEE6154A3DD8DD7DC07E0153915ADFEDC2BA291E"
    },
    {
        version:"3.12",
        entry_points: entry_points_3120,
        indirect_jumps: new Set([0xB46, 0xB58]),
        adc_lookup_table_addr: 0xF7E2,
        adc_lookup_table_index_offset: 0,
        targets:["rego637w"],
        hash:"63827F591D37163F2DA75BE7323F6EB70478277A0243C898E79DE14475524F1B"
    }
];

let curr_firmware = firmware_profiles[0];

function setCurrentFirmwareProfile(hashString) {
    for (const profile of firmware_profiles) {
        if (profile.hash === hashString) {
            curr_firmware = profile;
            console.log("selected firmware profile:", curr_firmware);
            log("selected firmware profile for: " + profile.version + ", hash:" + hashString);
            return;
        }
    }
    curr_firmware = firmware_profiles[0];
    console.error("ERROR COULD NOT FIND THE FIRMWARE PROFILE FOR hash: " + hashString);
    log("ERROR COULD NOT FIND THE FIRMWARE PROFILE FOR hash: " + hashString);
}