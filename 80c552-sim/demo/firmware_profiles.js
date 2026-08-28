
const MAP_TYPE = {
    FUNC:0,
    DATA:1
};

let default_code_map = [
    {start:0x0000, label:"reset", comment:"Program execution starts here."}, 
    {start:0x000B, label:"TIMER0_IRQ_VECTOR"}, 
    {start:0x0023, label:"UART_IRQ_VECTOR"},
    {start:0x002B, label:"I2C_IRQ_VECTOR"},
];

let code_map_3021 = [
    ...default_code_map,
];

//{start:0x, type:MAP_TYPE.FUNC, label:""},

let code_map_3060 = [
    ...default_code_map,
    {start:0x002E, type:MAP_TYPE.FUNC, label:"START_AFTER_RESET_VECTOR"}, 
    {start:0x0136, type:MAP_TYPE.FUNC, label:"fixed_mul_8_8_r2r3_r4r5_wrapper"},
    {start:0x013a, type:MAP_TYPE.FUNC, label:"fixed_mul_8_8_r2r3_r4r5"},
    {start:0x0160, type:MAP_TYPE.FUNC, label:"signed_divide_16bit_wrapper"},
    {start:0x069E, type:MAP_TYPE.FUNC, label:"BY_CMD_DISPATCH_TABLE_LOOKUP"},
    {start:0x0883, type:MAP_TYPE.FUNC, label:"ReadMemory_using_R5_R6_R7"},
    {start:0x0887, type:MAP_TYPE.FUNC, label:"ReadMemory_using_R1_R2_R3"},
    {start:0x0889, type:MAP_TYPE.FUNC, label:"ReadSelectedMemoryType"},
    {start:0x0A16, type:MAP_TYPE.FUNC, label:"SetupMemoryAccessAbsolute"},
    {start:0x0A3A, type:MAP_TYPE.FUNC, label:"SetupMemoryAccessOffset"},
    {start:0x0B5A, type:MAP_TYPE.FUNC, label:"intmem_read_3bytes_to_R7_R6_R5"},
    {start:0x0B93, type:MAP_TYPE.FUNC, label:"convert_index_to_16_bit_address_using_R5"},
    {start:0x0B9D, type:MAP_TYPE.FUNC, label:"convert_index_to_16_bit_address_using_R7"},
    {start:0x0B9F, type:MAP_TYPE.FUNC, label:"convert_index_to_16_bit_adress_using_A_B"},
    {start:0x0BC3, type:MAP_TYPE.FUNC, label:"extmem_read_3bytes_to_R7_R6_R5"},
    {start:0x665F, type:MAP_TYPE.FUNC, label:"MAIN_LOOP_TASK", comment:"this continuously run the main program"},
    {start:0x6799, type:MAP_TYPE.FUNC, label:"MAIN_LOOP_ENTRY", comment:"this need a better name"},
    {start:0x67A2, type:MAP_TYPE.FUNC, label:"BEFORE_MAIN_ENTRY_INIT", comment:"this need a better name"},
    
    {start:0x67D7, type:MAP_TYPE.FUNC, label:"extram_zerofill"}, 
    {start:0x6829, type:MAP_TYPE.FUNC, label:"TIMER0_IRQ_HANDLER"}, 

    {start:0x6869, type:MAP_TYPE.FUNC, label:"I2C_IRQ_HANDLER"},
    {start:0x687E, end:0x68E1, type:MAP_TYPE.DATA, label:"i2c_status_lookup_table"},
    {start:0x68EE, type:MAP_TYPE.FUNC, label:"i2c_status_08"},
    {start:0x68FD, type:MAP_TYPE.FUNC, label:"i2c_status_10"},
    {start:0x690C, type:MAP_TYPE.FUNC, label:"i2c_status_18"},
    {start:0x691B, type:MAP_TYPE.FUNC, label:"i2c_status_20"},
    {start:0x692D, type:MAP_TYPE.FUNC, label:"i2c_status_28"},
    {start:0x6951, type:MAP_TYPE.FUNC, label:"i2c_status_30"},
    {start:0x695C, type:MAP_TYPE.FUNC, label:"i2c_status_38"},
    {start:0x696A, type:MAP_TYPE.FUNC, label:"i2c_status_40"},
    {start:0x696F, type:MAP_TYPE.FUNC, label:"i2c_status_48"},
    {start:0x697A, type:MAP_TYPE.FUNC, label:"i2c_status_50"},
    {start:0x698C, type:MAP_TYPE.FUNC, label:"i2c_status_58"},
    {start:0x69A7, type:MAP_TYPE.FUNC, label:"i2c_status_others"},
    {start:0x69AF, type:MAP_TYPE.FUNC, label:"i2c_unknown_status_handler"},
    {start:0x69BA, type:MAP_TYPE.FUNC, label:"i2c_status_common_end"},

    {start:0x69FF, type:MAP_TYPE.FUNC, label:"init_i2c_transfer"},

    {start:0x6A15, type:MAP_TYPE.FUNC, label:"init_function"},

    {start:0x6A42, type:MAP_TYPE.FUNC, label:"UART_RX_START_BYTE_CHECK"},
    {start:0x6A6A, type:MAP_TYPE.FUNC, label:"UART_IRQ_HANDLER"},
    {start:0x6B2C, type:MAP_TYPE.FUNC, label:"UART_SEND_ONE_BYTE"},

    {start:0x6B48, type:MAP_TYPE.FUNC, label:"Read_DS1302_byte"}, // RTC
    {start:0x6B72, type:MAP_TYPE.FUNC, label:"DS1302_BurstRead_DateTime"},
    {start:0x6BF1, type:MAP_TYPE.FUNC, label:"DS1302_Write_Register_Byte"},
    {start:0x6C6A, type:MAP_TYPE.FUNC, label:"DS1302_Read_Register_Byte"},
    {start:0x6CB4, type:MAP_TYPE.FUNC, label:"DS1302_WriteTimeFromTemporary"},
    {start:0x6CE2, type:MAP_TYPE.FUNC, label:"DS1302_RTC_init"},

    {start:0x6D99, type:MAP_TYPE.FUNC, label:"Kick_internal_WDT"},
    {start:0x6DA0, type:MAP_TYPE.FUNC, label:"Kick_external_WDT", comment:"TC1232 supervisor"},

    {start:0x6E89, type:MAP_TYPE.FUNC, label:"read_29f040_settings_from_bank0"},
    {start:0x707F, type:MAP_TYPE.FUNC, label:"GET_ERROR_FROM_LOG"},
    {start:0x72DF, type:MAP_TYPE.FUNC, label:"AM29F040_CommandUnlockAndWaitDQ7"},
    {start:0x73C6, type:MAP_TYPE.FUNC, label:"SaveSettingTo29F040Journal"},
    {start:0x75EF, type:MAP_TYPE.FUNC, label:"AM29f040_write_alternative"},

    {start:0x7914, type:MAP_TYPE.FUNC, label:"read_protection_inputs"},
    {start:0x7C95, type:MAP_TYPE.FUNC, label:"update_both_4094"},

    {start:0x7DE4, type:MAP_TYPE.FUNC, label:"front_panel_update_prepare_data_and_send_line"},
    {start:0x7EE6, end:0x7EFB, type:MAP_TYPE.DATA, label:"front panel translate character table"},
    {start:0x8126, type:MAP_TYPE.FUNC, label:"write_LCD_using_IRAM_2A_2B_2C"},
    {start:0x83DF, type:MAP_TYPE.FUNC, label:"REFRESH_FRONT_PANEL_OUTPUTS"},
    {start:0x84AD, type:MAP_TYPE.FUNC, label:"decode_front_panel_input_states"},

    {start:0x876E, type:MAP_TYPE.FUNC, label:"PHASES_READ_STATES", comment:"used by PHASE_CHECK_TASK"},
    {start:0x87BE, type:MAP_TYPE.FUNC, label:"PHASE_CHECK_TASK", comment:"make sure that the 3 phases are present and make sure that they run in correct order"},

    {start:0x88B6, type:MAP_TYPE.FUNC, label:"UART_SEND_20_BYTES_UNPACKED_PLUS_CHECKSUM"},
    {start:0x8919, type:MAP_TYPE.FUNC, label:"UART_SEND_AS_3_BYTES_PLUS_CHECKSUM"},
    {start:0x8970, type:MAP_TYPE.FUNC, label:"JMP_CODE_UART_RX_TASK"},
    {start:0x8A40, end:0x8A67, type:MAP_TYPE.DATA, label:"UART_RX_CMD_LOOKUP_TABLE"},
    {start:0x8A68, type:MAP_TYPE.FUNC, label:"uart_cmd_00_front_panel_read"},
    {start:0x8A81, type:MAP_TYPE.FUNC, label:"uart_cmd_01_front_panel_write"},
    {start:0x8A9E, type:MAP_TYPE.FUNC, label:"uart_cmd_02_sys_reg_read"},
    {start:0x8AB5, type:MAP_TYPE.FUNC, label:"uart_cmd_03_sys_reg_write"},
    {start:0x8AE1, type:MAP_TYPE.FUNC, label:"uart_cmd_04_timer_reg_read"},
    {start:0x8AFA, type:MAP_TYPE.FUNC, label:"uart_cmd_05_timer_reg_write"},
    {start:0x8B16, type:MAP_TYPE.FUNC, label:"uart_cmd_06_menu_reg_read"},
    {start:0x8B2E, type:MAP_TYPE.FUNC, label:"uart_cmd_07_menu_reg_write"},
    {start:0x8B4A, type:MAP_TYPE.FUNC, label:"uart_cmd_20_display_reg_read"},
    {start:0x8B5F, type:MAP_TYPE.FUNC, label:"uart_cmd_40_read_last_error_line"},
    {start:0x8B73, type:MAP_TYPE.FUNC, label:"uart_cmd_42_read_prev_error_line"},
    {start:0x8B87, type:MAP_TYPE.FUNC, label:"uart_cmd_7F_read_rego_ver"},
    {start:0x8B90, type:MAP_TYPE.FUNC, label:"uart_cmd_reset_rx_index"},

    {start:0x8B95, type:MAP_TYPE.FUNC, label:"MainLoop_where_UART_rx", comment:"need a better name but it's from where the uart rx is run, it also do other stuff related to the user interface"},

    {start:0x8E2E, type:MAP_TYPE.FUNC, label:"BEFORE_MAIN_ENTRY"},
    {start:0x8E3A, type:MAP_TYPE.FUNC, label:"ProcessFrontPanelAndMenuState"},

    {start:0x94C9, type:MAP_TYPE.FUNC, label:"menu_function_lockup"},
    {start:0x94CC, end:0x9529, type:MAP_TYPE.DATA, label:"menu_function_lockup_table"},
    {start:0x952A, type:MAP_TYPE.FUNC, label:"menu_type_00_trampoline"},
    {start:0x9530, type:MAP_TYPE.FUNC, label:"menu_type_01_trampoline"},
    {start:0x953C, type:MAP_TYPE.FUNC, label:"menu_type_05_trampoline"},
    {start:0x9542, type:MAP_TYPE.FUNC, label:"menu_type_06_trampoline"},
    {start:0x9547, type:MAP_TYPE.FUNC, label:"menu_type_07_trampoline"},
    {start:0x954C, type:MAP_TYPE.FUNC, label:"menu_type_08_trampoline"},
    {start:0x9551, type:MAP_TYPE.FUNC, label:"menu_type_09_trampoline"},
    {start:0x9556, type:MAP_TYPE.FUNC, label:"menu_type_0A_trampoline"},
    {start:0x955B, type:MAP_TYPE.FUNC, label:"menu_type_0B_trampoline"},
    {start:0x9560, type:MAP_TYPE.FUNC, label:"menu_type_0E_trampoline"},
    {start:0x9565, type:MAP_TYPE.FUNC, label:"menu_type_0F_trampoline"},
    {start:0x956A, type:MAP_TYPE.FUNC, label:"menu_type_10_trampoline"},
    {start:0x956F, type:MAP_TYPE.FUNC, label:"menu_type_11_trampoline"},
    {start:0x9574, type:MAP_TYPE.FUNC, label:"menu_type_12_trampoline"},
    {start:0x9579, type:MAP_TYPE.FUNC, label:"menu_type_13_trampoline"},
    {start:0x957E, type:MAP_TYPE.FUNC, label:"menu_type_14_trampoline"},
    {start:0x9583, type:MAP_TYPE.FUNC, label:"menu_type_15_trampoline"},
    {start:0x9588, type:MAP_TYPE.FUNC, label:"menu_type_16_trampoline"},
    {start:0x958D, type:MAP_TYPE.FUNC, label:"menu_type_17_trampoline"},
    {start:0x9592, type:MAP_TYPE.FUNC, label:"menu_type_18_trampoline"},
    {start:0x959C, type:MAP_TYPE.FUNC, label:"menu_type_19_trampoline"},
    {start:0x95A1, type:MAP_TYPE.FUNC, label:"menu_type_1A_trampoline"},
    {start:0x95AB, type:MAP_TYPE.FUNC, label:"menu_type_1B_trampoline"},
    {start:0x95B0, type:MAP_TYPE.FUNC, label:"menu_type_1C_trampoline"},
    {start:0x95B5, type:MAP_TYPE.FUNC, label:"menu_type_1D_trampoline"},
    {start:0x95BA, type:MAP_TYPE.FUNC, label:"menu_type_1E_trampoline"},
    {start:0x95BF, type:MAP_TYPE.FUNC, label:"menu_type_1F_trampoline"},
    {start:0x9597, type:MAP_TYPE.FUNC, label:"menu_type_20_trampoline"},
    {start:0x95A6, type:MAP_TYPE.FUNC, label:"menu_type_21_trampoline"},
    {start:0x9536, type:MAP_TYPE.FUNC, label:"menu_type_2D_trampoline"},
    {start:0x95C6, type:MAP_TYPE.FUNC, label:"menu_type_RET_trampoline"},

    {start:0x95C7, type:MAP_TYPE.FUNC, label:"menu_type_00_func"},
    {start:0x95F2, type:MAP_TYPE.FUNC, label:"menu_type_01_func"},
    {start:0x9822, type:MAP_TYPE.FUNC, label:"menu_type_04_2D_func"},
    {start:0x9AD6, type:MAP_TYPE.FUNC, label:"menu_type_06_07_10_func"},
    //{start:0x9AD6, type:MAP_TYPE.FUNC, label:"menu_type_07"},
    {start:0xA510, type:MAP_TYPE.FUNC, label:"menu_type_08_func"},
    {start:0xA5B8, type:MAP_TYPE.FUNC, label:"menu_type_09_func"},
    {start:0xA894, type:MAP_TYPE.FUNC, label:"menu_type_0A_func"},
    {start:0xA902, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET"},
    {start:0xAE58, type:MAP_TYPE.FUNC, label:"menu_type_0E_func"},
    {start:0xB5BE, type:MAP_TYPE.FUNC, label:"menu_type_0F_func"},
    //{start:0x9AD6, type:MAP_TYPE.FUNC, label:"menu_type_10_func"},
    {start:0xB92F, type:MAP_TYPE.FUNC, label:"menu_type_11_func"},
    {start:0xBBF3, type:MAP_TYPE.FUNC, label:"menu_type_12_func"},
    {start:0xBEAC, type:MAP_TYPE.FUNC, label:"menu_type_13_func"},
    {start:0xC3FD, type:MAP_TYPE.FUNC, label:"menu_type_14_func"},
    {start:0xC476, type:MAP_TYPE.FUNC, label:"menu_type_15_func"}, // THIS is the only meny type that can print the mysterious 'Adress' string
    {start:0xC6CC, type:MAP_TYPE.FUNC, label:"menu_type_16_func"},
    {start:0xC723, end:0xC735, type:MAP_TYPE.DATA, label:"menu_type_16_subtype_lockup_table"},
    {start:0xC736, type:MAP_TYPE.FUNC, label:"menu_type_16_subtype_48_func"},
    {start:0xC793, type:MAP_TYPE.FUNC, label:"menu_type_16_subtype_4A_func"},
    {start:0xC864, type:MAP_TYPE.FUNC, label:"menu_type_16_subtype_4C_func"},
    {start:0xC8C1, type:MAP_TYPE.FUNC, label:"menu_type_16_subtype_4E_func"},
    {start:0xC987, type:MAP_TYPE.FUNC, label:"menu_type_16_subtype_46_func"},
    {start:0xC9DB, type:MAP_TYPE.FUNC, label:"menu_type_16_subtype_default_func"},
    {start:0xC9DC, type:MAP_TYPE.FUNC, label:"menu_type_17_func"},
    {start:0xCAA2, type:MAP_TYPE.FUNC, label:"menu_type_18_func"},
    {start:0xCB13, type:MAP_TYPE.FUNC, label:"menu_type_20_func"},
    {start:0xCB87, type:MAP_TYPE.FUNC, label:"menu_type_19_func"},
    {start:0xCD87, type:MAP_TYPE.FUNC, label:"menu_type_1A_ROOT_MENU"},
    {start:0xD22D, type:MAP_TYPE.FUNC, label:"menu_type_1C_func"},
    {start:0xD402, type:MAP_TYPE.FUNC, label:"show_current_access_level"},
    {start:0xD40F, end:0xD41E, type:MAP_TYPE.DATA, label:"show_current_access_level_lockup_table"},
    {start:0xD41F, type:MAP_TYPE.FUNC, label:"show_current_access_level_01"},
    {start:0xD432, type:MAP_TYPE.FUNC, label:"show_current_access_level_02"},
    {start:0xD445, type:MAP_TYPE.FUNC, label:"show_current_access_level_04"},
    {start:0xD458, type:MAP_TYPE.FUNC, label:"show_current_access_level_08"},
    {start:0xD46B, type:MAP_TYPE.FUNC, label:"show_current_access_level_RET"},
    {start:0xD46C, type:MAP_TYPE.FUNC, label:"menu_type_21_func"},
    {start:0xD836, type:MAP_TYPE.FUNC, label:"menu_type_1B_LOG_VIEW"},
    
    {start:0xDA49, type:MAP_TYPE.FUNC, label:"menu_type_1D_func"},
    {start:0xDD18, type:MAP_TYPE.FUNC, label:"menu_type_1E_func"},
    {start:0xDE23, type:MAP_TYPE.FUNC, label:"menu_type_1F_func"},
    
    

    
    
];

//{start:0x, type:MAP_TYPE.FUNC, label:""},

let code_map_3120 = [
    ...default_code_map,
];

let firmware_profiles = [
    {
        version:"unknown", 
        code_map: default_code_map,
        indirect_jumps: [],
        adc_lookup_table_addr: 0xF700, // just somewhere where it could be
        adc_lookup_table_index_offset: 9,
        targets:["unknown"],
        hash:""
    },
    {
        version:"3.021",
        code_map: code_map_3021,
        indirect_jumps: new Set([]),
        adc_lookup_table_addr: 0xF79C,
        adc_lookup_table_index_offset: 9,
        targets:["rego634"],
        hash:"4AE4D6CE67A84CEE2CCC19738CF3BDD91D865238FE8DC4822DE0D291F5F4EA8B"
    },
    {
        version:"3.06",
        code_map: code_map_3060,
        indirect_jumps: new Set([0xB29, 0xB3B]),
        adc_lookup_table_addr: 0xF7C6,
        adc_lookup_table_index_offset: 9,
        targets:["rego637","rego637e"],
        hash:"BD8E616AE8F6B31BB731104EBEE6154A3DD8DD7DC07E0153915ADFEDC2BA291E"
    },
    {
        version:"3.12",
        code_map: code_map_3120,
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