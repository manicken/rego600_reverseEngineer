# REGO600 Reverse Engineering & Simulator

A browser-based reverse-engineering and simulation environment for
the IVT REGO600 heat-pump controller.

The project combines a custom Philips/NXP 80C552 simulator with the
original REGO600 firmware, hardware peripheral models, disassembly,
assembly editing, memory inspection and profiling tools.

The goal is not to reimplement the REGO600 control software, but to
run and investigate the original firmware in a browser-based
environment.

## Project layout

80c552/                 80C552 CPU/SFR implementation
aimini_js51vm/          js51-based 8051 VM and instruction machinery
AppWindows/             Application windows and window manager
components/             Reusable UI components
ext_devices/            Simulated external hardware
panels/                 Simulator/debugger panels
rego600/                REGO600-specific simulation code
utils/                  Shared utilities
components/assembler/   8051 assembler
components/lcd_sim/     Simple character LCD simulator
components/tabmanager/  Tab/session and file management for Ace editors
components/button-bar/  Reusable button bar UI component
components/menu/        Reusable menu UI component
libs/                   Third-party libraries
ace/                    Ace editor extensions

## Main features

- Philips/NXP 80C552 simulation
- Original REGO600 firmware execution
- External SRAM and AM29F040 flash simulation
- REGO600 front-panel simulation
- Text LCD-lookalike simulation
- I/O and peripheral simulation
- 8051 disassembler
- 8051 assembler/editor
- Hex editor
- XRAM access monitoring
- Execution profiling
- Breakpoints and code navigation
- Firmware memory inspection
- Multiple independent application windows

## Reverse engineering

The simulator was developed as part of an ongoing reverse-engineering
effort of the REGO600 controller hardware and firmware.

The hardware uses a Philips/NXP 80C552-class MCU together with external
code flash, data flash and SRAM. The simulator models the relevant
hardware interfaces sufficiently to allow the original firmware to
execute and interact with simulated peripherals.

Firmware versions can be loaded and investigated without modifying the
original firmware image.