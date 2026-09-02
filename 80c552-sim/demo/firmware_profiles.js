
const MAP_TYPE = {
    FUNC:0,
    DATA:1,
    FREE:2
};

let default_code_map = [
    {start:0x0000, type:MAP_TYPE.FUNC, label:"reset", comment:"Program execution starts here."}, 
    {start:0x000B, type:MAP_TYPE.FUNC, label:"TIMER0_IRQ_VECTOR"}, 
    {start:0x0023, type:MAP_TYPE.FUNC, label:"UART_IRQ_VECTOR"},
    {start:0x002B, type:MAP_TYPE.FUNC, label:"I2C_IRQ_VECTOR"},
];

let code_map_3021 = [
    ...default_code_map,
];

//{start:0x, type:MAP_TYPE.FUNC, label:""},

let code_map_3060 = [
    ...default_code_map,
    {start:0x002E, type:MAP_TYPE.FUNC, label:"START_AFTER_RESET_VECTOR"}, 
    {start:0x00BA, type:MAP_TYPE.FUNC, label:"copy_from_code_to_iram_using_struct_at_dptr"}, 
    {start:0x00D8, type:MAP_TYPE.FUNC, label:"copy_from_code_to_xram_using_struct_at_dptr"}, 
    {start:0x010F, end:0x0112, type:MAP_TYPE.DATA, label:"some data copy range type A"},
    {start:0x0113, end:0x0116, type:MAP_TYPE.DATA, label:"some data copy range type A"},
    {start:0x0117, end:0x011A, type:MAP_TYPE.DATA, label:"some data copy range type A"},
    {start:0x011B, end:0x0120, type:MAP_TYPE.DATA, label:"some data copy range type B"},
    {start:0x0121, end:0x0126, type:MAP_TYPE.DATA, label:"some data copy range type B"},
    {start:0x0127, end:0x012C, type:MAP_TYPE.DATA, label:"some data copy range type B"},
    {start:0x012D, type:MAP_TYPE.FUNC, label:"infinite loop failsafe"},
    {start:0x012F, type:MAP_TYPE.FUNC, label:"fixed_mul_8_8_r2r3_r0r1_r6r7_wrapper"},
    {start:0x0136, type:MAP_TYPE.FUNC, label:"fixed_mul_8_8_r2r3_r0r1_r4r5_wrapper"},
    {start:0x013a, type:MAP_TYPE.FUNC, label:"fixed_mul_8_8_r2r3_r0r1"},
    {start:0x0160, type:MAP_TYPE.FUNC, label:"signed_divide_16bit_wrapper"},
    {start:0x0668, type:MAP_TYPE.FUNC, label:"BY_INDEX_DISPATCH_TABLE_LOOKUP"},
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

    {start:0x0BE1, end:0x0BEC, type:MAP_TYPE.DATA, label:"some IRAM init data"},
    {start:0x0BED, end:0x2D0D, type:MAP_TYPE.DATA, label:"menu structure copied to xram"},
    {start:0x2D0C, end:0x2D36, type:MAP_TYPE.DATA, label:"startup_message"},
    {start:0x2D37, end:0x2E37, type:MAP_TYPE.DATA, label:"other_strings"},
    {start:0x2E38, type:MAP_TYPE.FUNC, label:"APPLY_DEFAULT_SETTINGS"},
    
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
    /*{start:0x6A6E, type:MAP_TYPE.FUNC, label:"uart_rx_check_if_uart_done_is_set"},
    {start:0x6A75, type:MAP_TYPE.FUNC, label:"uart_rx_one_byte"},
    {start:0x6A78, type:MAP_TYPE.FUNC, label:"uart_rx_check_start_byte"},
    {start:0x6A7F, type:MAP_TYPE.FUNC, label:"uart_rx_start_received"},
    {start:0x6A85, type:MAP_TYPE.FUNC, label:"uart_rx_bytes_start_byte_rx_check"},
    {start:0x6A88, type:MAP_TYPE.FUNC, label:"uart_rx_bytes"},
    {start:0x6A8E, type:MAP_TYPE.FUNC, label:"uart_rx_done"},
    {start:0x6A90, type:MAP_TYPE.FUNC, label:"uart_rx_reset"},
    {start:0x6A94, type:MAP_TYPE.FUNC, label:"uart_rx_irq_skip"},
    {start:0x6A96, type:MAP_TYPE.FUNC, label:"uart_rx_irq_end"},*/

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
    {start:0x707F, type:MAP_TYPE.FUNC, label:"GET_ERROR_FROM_LOG", comment:"note here target refer to where the log is copied to", parameters:{'R4':'(0:last, 1:next)', 'R5':'target_addr_LSB', 'R6':'target_addr_MSB', 'R7':'target_memtype'}},
    {start:0x72DF, type:MAP_TYPE.FUNC, label:"AM29F040_CommandUnlockAndWaitDQ7"},
    {start:0x73C6, type:MAP_TYPE.FUNC, label:"SaveSettingTo29F040Journal"},
    {start:0x75EF, type:MAP_TYPE.FUNC, label:"AM29f040_write_alternative"},
    {start:0x7750, end:0x775D, type:MAP_TYPE.DATA, label:"29f040_write_something_lookup_table"},
    {start:0x775E, type:MAP_TYPE.FUNC, label:"29f040_write_something_lookup_index_0"},
    {start:0x7778, type:MAP_TYPE.FUNC, label:"29f040_write_something_lookup_index_1"},
    {start:0x7792, type:MAP_TYPE.FUNC, label:"29f040_write_something_lookup_index_2"},
    {start:0x77AC, type:MAP_TYPE.FUNC, label:"29f040_write_something_lookup_index_3"},
    {start:0x77C6, type:MAP_TYPE.FUNC, label:"29f040_write_something_lookup_index_4"},
    {start:0x77DA, type:MAP_TYPE.FUNC, label:"@29f040_write_something_lookup_default"},

    {start:0x7914, type:MAP_TYPE.FUNC, label:"read_protection_inputs_and_ADC"},

    {start:0x797B, end:0x799E, type:MAP_TYPE.DATA, label:"sensor_input_to_aquire_lookup_table"},
    {start:0x7C82, type:MAP_TYPE.FUNC, label:"sensor_input_to_aquire_lookup_table_default_entry"},
    {start:0x7C95, type:MAP_TYPE.FUNC, label:"update_both_4094"},
    {start:0x799F, type:MAP_TYPE.FUNC, label:"EXT_CONTROL_INPUT_READ"},
    {start:0x79B9, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT5"},
    {start:0x79F1, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT4"},
    {start:0x7A29, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT11"},
    {start:0x7A61, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT3X"},
    {start:0x7A99, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT1"},
    {start:0x7AD1, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT2"},
    {start:0x7B09, type:MAP_TYPE.FUNC, label:"read_pressure_sensor_LP"},
    {start:0x7B28, type:MAP_TYPE.FUNC, label:"read_pressure_sensor_HP"},
    {start:0x7B47, type:MAP_TYPE.FUNC, label:"exec_SERVICE_PORT_ADC_INPUT"},
    {start:0x7B6B, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT10"},
    {start:0x7BA3, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT8"},
    {start:0x7BDB, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT6"},
    {start:0x7C12, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT3"},
    {start:0x7C49, type:MAP_TYPE.FUNC, label:"exec_ADC_of_VVP_unused"},
    {start:0x7C4B, type:MAP_TYPE.FUNC, label:"exec_ADC_of_GT9"},

    {start:0x7DE4, type:MAP_TYPE.FUNC, label:"front_panel_update_prepare_data_and_send_line"},
    {start:0x7EE6, end:0x7EFB, type:MAP_TYPE.DATA, label:"front panel translate character table"},
    {start:0x8126, type:MAP_TYPE.FUNC, label:"write_LCD_using_IRAM_2A_2B_2C"},
    {start:0x83DF, type:MAP_TYPE.FUNC, label:"REFRESH_FRONT_PANEL_OUTPUTS"},
    {start:0x84AD, type:MAP_TYPE.FUNC, label:"decode_front_panel_input_states"},

    {start:0x876E, type:MAP_TYPE.FUNC, label:"PHASES_READ_STATES", comment:"used by PHASE_CHECK_TASK"},
    {start:0x87BE, type:MAP_TYPE.FUNC, label:"PHASE_CHECK_TASK", comment:"make sure that the 3 phases are present and make sure that they run in correct order"},

    {start:0x88B6, type:MAP_TYPE.FUNC, label:"UART_SEND_20_BYTES_UNPACKED_PLUS_CHECKSUM", parameters:{'R5':'source_addr_LSB', 'R6':'source_addr_MSB', 'R7':'source_memtype'}},
    {start:0x8919, type:MAP_TYPE.FUNC, label:"UART_SEND_AS_3_BYTES_PLUS_CHECKSUM", parameters:{'R5':'data_MSB', 'R4':'data_LSB'}},
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

    {start:0x9120, end:0x922D, type:MAP_TYPE.DATA, label:"maybe_menu_related_lookup_table"},
    {start:0x912E, type:MAP_TYPE.FUNC, label:"maybe_menu_related_lookup_table_index_0"},
    {start:0x91C9, type:MAP_TYPE.FUNC, label:"maybe_menu_related_lookup_table_index_1"},
    {start:0x9372, type:MAP_TYPE.FUNC, label:"maybe_menu_related_lookup_table_index_2"},
    {start:0x9264, type:MAP_TYPE.FUNC, label:"maybe_menu_related_lookup_table_index_3"},
    {start:0x939D, type:MAP_TYPE.FUNC, label:"maybe_menu_related_lookup_table_index_4"},
    {start:0x93FC, type:MAP_TYPE.FUNC, label:"maybe_menu_related_lookup_table_default"},

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
    {start:0xAA9F, end:0xAAB0, type:MAP_TYPE.DATA, label:"menu_type_0B_RTC_SET_lockup_table"},
    {start:0xAAB1, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_index_0"},
    {start:0xAACB, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_index_1"},
    {start:0xAAE4, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_index_2"},
    {start:0xAAF4, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_index_3"},
    {start:0xAB04, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_index_4"},
    {start:0xAB14, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_index_5"},
    {start:0xAB2D, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_index_6"},
    {start:0xAB4D, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_default"},
    {start:0xAB55, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_end"},

    {start:0xAB8B, end:0xAB9C, type:MAP_TYPE.DATA, label:"menu_type_0B_RTC_SET_lockup_table_B"},
    {start:0xAB9D, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_index_0"},
    {start:0xABCA, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_index_1"},
    {start:0xABF7, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_index_2"},
    {start:0xAC24, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_index_3"},
    {start:0xAC51, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_index_4"},
    {start:0xAC7D, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_index_5"},
    {start:0xACA9, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_index_6"},
    {start:0xACD5, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_B_default"},
    {start:0xACD5, type:MAP_TYPE.FUNC, label:"menu_type_0B_RTC_SET_lockup_table_end"},

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
    
    {start:0xE17F, end:0xE192, type:MAP_TYPE.DATA, label:"some_lookup_table"},
    {start:0xE193, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_0"},
    {start:0xE1A3, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_1"},
    {start:0xE1BA, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_2"},
    {start:0xE1D1, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_3"},
    {start:0xE1E8, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_4"},
   // {start:0xE221, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_5"},
    {start:0xE1FB, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_6"},
    {start:0xE20E, type:MAP_TYPE.FUNC, label:"some_lookup_table_index_7"},
    
    {start:0xE221, type:MAP_TYPE.FUNC, label:"some_lookup_table_default_and_index_5"},
    {start:0xE230, type:MAP_TYPE.FUNC, label:"some_lookup_table_END"},

    {start:0xF7C6, end:0xFFC5, type:MAP_TYPE.DATA, label:"ADC_temp_lookup_table", comment:"16bit entries"},
    {start:0xFFC6, end:0xFFCB, type:MAP_TYPE.DATA, label:"lcd_char_lookup_table_maybe1"},
    {start:0xFFCC, end:0xFFD5, type:MAP_TYPE.DATA, label:"lcd_char_lookup_table_maybe2"},
    {start:0xFFD6, end:0xFFFF, type:MAP_TYPE.FREE}
];

function getCodeMapItemTooltipContents(item) {
    let text = "";
    if (item?.comment) {
        text = item.comment + '\n';
    }
    if (item?.parameters) {
        text += '\nParameters:\n';
        for (const [key, value] of Object.entries(item.parameters)) {
            text += `${key}: ${value}` + '\n';
        }
    }
    return text;
}

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
        version:"3.06 patched",
        code_map: code_map_3060,
        indirect_jumps: new Set([0xB29, 0xB3B]),
        adc_lookup_table_addr: 0xF7C6,
        adc_lookup_table_index_offset: 9,
        targets:["rego637","rego637e"],
        hash:"8EDF2C5602DDB973289402AA1CCD01646D3EC247B8F20B46E0FCED03E8DAFEF7"
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

function getCodeMemInfo(addr) {
    for (let item of curr_firmware.code_map) {
        if (item.start == addr) {
            return item;
        }
    }
    return undefined;
}

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