;INCLUDE 'UART,common.asm'
LCD_MSB  equ 0x0B
; skip delay after FP write
;ORG 0x7f53
ORG 0x7f5b
RET

; 24 6E F5 82 E4 34 0A F5 83 ; row 1/4
; 24 82 F5 82 E4 34 0A F5 83  ; row 2/4
; 24 97 F5 82 E4 34 0A  ; row 3/4
; 24 ac F5 82 E4 34 0A  ; row 4/4

; ORIGINAL
;LCD_ROW_OFFSET equ 0x15
;LCD_MSB  equ 0x0A
;LCD_ROW1 EQU 0x6E
;LCD_ROW2 EQU 0x83
;LCD_ROW3 EQU 0x98
;LCD_ROW4 EQU 0xAD

; MODDED
LCD_ROW_OFFSET equ 0x20
LCD_BUFF_OFFSET equ 0x80
LCD_MSB  equ 0x0B
LCD_ROW1 equ 0x00
LCD_ROW2 EQU 0x20
LCD_ROW3 EQU 0x40
LCD_ROW4 EQU 0x60


LCD_ROW1_SENT equ LCD_ROW1+LCD_BUFF_OFFSET
LCD_ROW2_SENT EQU LCD_ROW2+LCD_BUFF_OFFSET
LCD_ROW3_SENT EQU LCD_ROW3+LCD_BUFF_OFFSET
LCD_ROW4_SENT EQU LCD_ROW4+LCD_BUFF_OFFSET

; UART_CMD_20
ORG 0x8B4D
    MOV B,#LCD_ROW_OFFSET
    MUL AB
    ADD A,#LCD_ROW1
    MOV R5,A
    CLR A
    ADDC A,#LCD_MSB

; ROW 1
ORG 0x7765
    ADD A,#LCD_ROW1
ORG 0x776A
    ADDC A,#LCD_MSB
ORG 0x8365
    ADD A,#LCD_ROW1
ORG 0x836A
    ADDC A,#LCD_MSB
ORG 0x83FA
    ADD A,#LCD_ROW1
ORG 0x83FF
    ADDC A,#LCD_MSB

; ROW2
ORG 0x777F
    ADD A,#LCD_ROW2
ORG 0x7784
    ADDC A,#LCD_MSB
ORG 0x77E8
    ADD A,#(LCD_ROW2-1)
ORG 0x77ED
    ADDC A,#LCD_MSB
ORG 0x8387
    ADD A,#(LCD_ROW2-1)
ORG 0x838C
    ADDC A,#LCD_MSB
ORG 0x842D
    ADD A,#(LCD_ROW2-1)
ORG 0x8432
    ADDC A,#LCD_MSB

; ROW3
ORG 0x7799
    ADD A,#LCD_ROW3
ORG 0x779E
    ADDC A,#LCD_MSB
ORG 0x83A9
    ADD A,#(LCD_ROW3-1)
ORG 0x83AE
    ADDC A,#LCD_MSB
ORG 0x8460
    ADD A,#(LCD_ROW3-1)
ORG 0x8465
    ADDC A,#LCD_MSB

; ROW4
ORG 0x77B3
    ADD A,#LCD_ROW4
ORG 0x77B8
    ADDC A,#LCD_MSB
ORG 0x83CB
    ADD A,#(LCD_ROW4-1)
ORG 0x83D0
    ADDC A,#LCD_MSB
ORG 0x8493
    ADD A,#(LCD_ROW4-1)
ORG 0x8498
    ADDC A,#LCD_MSB


; parameters for 
; front_panel_update_prepare_data_and_send_line
; R4 = row, R5 = col, R6 = data

; Replace R5 with R3 as the temporary register used by
; front_panel_update_prepare_data_and_send_line.
; R5 is then free for the display refresh routine to use
; exclusively as the LCD column counter.
ORG 0x7E1D
    MOV R3,A ; was MOV R5,A
ORG 0x7E20
    ORL A,R3 ; was ORL A,R3

ORG 0x7E2D
    MOV R3,A ; was MOV R5,A
ORG 0x7E30
    ORL A,R3 ; was ORL A,R3

ORG 0x7E3D
    MOV R3,A ; was MOV R5,A
ORG 0x7E40
    ORL A,R3 ; was ORL A,R3

ORG 0x7E62
    MOV R3,A ; was MOV R5,A
ORG 0x7E65
    ORL A,R3 ; was ORL A,R3

ORG 0x7E85
    MOV R3,A ; was MOV R5,A
ORG 0x7E88
    ORL A,R3 ; was ORL A,R3

ORG 0x7E95
    MOV R3,A ; was MOV R5,A
ORG 0x7E98
    ORL A,R3 ; was ORL A,R3

; parameters for 
; LCALL front_panel_update_prepare_data_and_send_line
; R4 = row, R5 = col, R6 = data

front_panel_update_prepare_data_and_send_line equ 0x7DE4

ORG 0x83DF
ORG_END 0x84AC
refresh_front_panel:
    MOV A,0x76
    ANL A,#0xF0
    JZ refresh_front_panel_end
    CLR EA ; disable interrupts, because need to use shared FP_FLAGS
    MOV A,0x76
    ANL A,#0x0F
    MOV 0x76,A
    SETB EA; enable interrupts

    MOV R2,#(0x00-LCD_ROW_OFFSET); buffert row LSB address
    MOV R4,#0x00; row
    MOV R5,#0x00; col
    MOV DPH,#LCD_MSB
check_send_one_row:
    INC R4
    MOV A,R4
    XRL A,#0x05
    JZ refresh_front_panel_end
    MOV R5,#0x00
    MOV A,R2
    ADD A,#LCD_ROW_OFFSET
    MOV R2,A
check_send_one_char:
    INC R5
    MOV A,R5
    XRL A,#0x15
    JZ check_send_one_row
    MOV A,R2
    ADD A,R5
    DEC A
    MOV DPL,A
    MOVX A,@DPTR
    MOV B,A
    MOV A,DPL
    ADD A,#LCD_BUFF_OFFSET
    MOV DPL,A; now DPTR points to BUFFERT B
    MOVX A,@DPTR
    XRL A,B
    JZ check_send_one_char
    MOV A,B
    MOV R6,A
    MOVX @DPTR,A
    LCALL front_panel_update_prepare_data_and_send_line
    SJMP check_send_one_char
refresh_front_panel_end:
    RET