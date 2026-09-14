;INCLUDE 'UART,common.asm'
;LCD_MSB  equ 0x0B
; skip delay after FP write
ORG 0x7f53
;ORG 0x7f5b
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

LCD_MSB  equ 0x0B
LCD_ROW1 equ 0x00
LCD_ROW2 EQU 0x20
LCD_ROW3 EQU 0x40
LCD_ROW4 EQU 0x60

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

LCD_BUFF_OFFSET equ 0x80
;LCD_ROW1_SENT equ LCD_ROW1+LCD_BUFF_OFFSET
;LCD_ROW2_SENT EQU LCD_ROW2+LCD_BUFF_OFFSET
;LCD_ROW3_SENT EQU LCD_ROW3+LCD_BUFF_OFFSET
;LCD_ROW4_SENT EQU LCD_ROW4+LCD_BUFF_OFFSET

ORG 0x83DF
ORG_END 0x84AC
refresh_front_panel:
    MOV A,0x76
	JNB A.4,refresh_row_2
	CLR A.4
	MOV R2,#0x00 ; R2 = buff-addr offset
	MOV R4,#0x01 ; R4 = row
	CALL send_one_row_func
refresh_row_2:
	MOV A,0x76
	JNB A.5,refresh_row_3
	CLR A.5
	MOV R2,#LCD_ROW_OFFSET ; R2 = buff-addr offset
	MOV R4,#0x02 ; R4 = row
	CALL send_one_row_func
refresh_row_3:
	MOV A,0x76
	JNB A.6,refresh_row_4
	CLR A.6
	MOV R2,#(LCD_ROW_OFFSET*2) ; R2 = buff-addr offset
	MOV R4,#0x03 ; R4 = row
	CALL send_one_row_func
refresh_row_4:
	MOV A,0x76
	JNB A.7,refresh_front_panel_end
	CLR A.7
	MOV R2,#(LCD_ROW_OFFSET*3) ; R2 = buff-addr offset
	MOV R4,#0x04 ; R4 = row
	CALL send_one_row_func
refresh_front_panel_end:
	RET

front_panel_update_prepare_data_and_send_line equ 0x7DE4

send_one_row_func:
	MOV 0x76,A
	MOV R3,#0x00 ; R3 = colTemp
send_one_row_func_loop:
    MOV DPH,#LCD_MSB
	INC R3
	MOV A,R3
    XRL A,#0x15
	JZ send_one_row_func_end
	MOV A,R3
    ADD A,R2 ; R2 = buff-addr offset
    DEC A
    MOV DPL,A
    MOVX A,@DPTR
    MOV B,A
    MOV A,DPL
    ADD A,#LCD_BUFF_OFFSET
    MOV DPL,A; now DPTR points to BUFFERT B
    MOVX A,@DPTR
    XRL A,B
    JZ send_one_row_func_loop
    MOV A,B
    MOV R6,A
    MOVX @DPTR,A
	MOV A,R3
	MOV R5,A
    LCALL front_panel_update_prepare_data_and_send_line
    SJMP send_one_row_func_loop
	
send_one_row_func_end:
	RET