ace.define("ace/mode/assembly_8051_highlight_rules", [
    "require",
    "exports",
    "module",
    "ace/lib/oop",
    "ace/mode/text_highlight_rules"
], function(require, exports, module) {

    const oop = require("../lib/oop");
    const TextHighlightRules =
        require("./text_highlight_rules").TextHighlightRules;
    const sfrNames = Object.keys(cpu.SFR);

    const sfrRegex =
        "\\b(?:" +
        sfrNames.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
        ")\\b";

    const Assembly8051HighlightRules = function() {

        this.$rules = {
            start: [

                // Comments
                {
                    token: "comment",
                    regex: ";.*$"
                },

                // Instructions
                {
                    token: "keyword.control.assembly",
                    regex:
                        "\\b(?:"
                        + "ACALL|ADD|ADDC|AJMP|ANL|CJNE|CLR|CPL|DA|DEC|DIV|DJNZ|"
                        + "INC|JB|JBC|JC|JMP|JNB|JNC|JNZ|JZ|LCALL|LJMP|"
                        + "MOV|MOVC|MOVX|MUL|NOP|ORL|POP|PUSH|RET|RETI|"
                        + "RL|RLC|RR|RRC|SETB|SJMP|SUBB|SWAP|XCH|XCHD|XRL"
                        + ")\\b",
                    caseInsensitive: true
                },

                { 
                    token: 'variable.parameter.register.assembly', 
                    //          first half are actual registers until spsr, where it changes to fields and flexible operands
                    regex: '\\b(?:r0|r1|r2|r3|r4|r5|r6|r7)\\b',
                    caseInsensitive: true 
                },

                // Immediate values
                /*{
                    token: "keyword.operator",
                    regex: "#(?:0x[0-9a-f]+|[0-9]+h|[0-9]+)\\b",
                    caseInsensitive: true
                },

                // Hex values / addresses
                {
                    token: "constant.numeric",
                    regex: "(?:0x[0-9a-f]+|[0-9a-f]+h|[0-9]+)\\b",
                    caseInsensitive: true
                },*/

                { 
                    token: 'constant.character.hexadecimal.assembly',
                    regex: '#0x[A-F0-9]+',
                    caseInsensitive: true 
                },
                { 
                    token: 'constant.character.decimal.assembly',
                    regex: '#[0-9]+' 
                },

                // Labels
                {
                    token: "entity.name.function",
                    regex: "^\\s*[A-Za-z_][\\w.]*:"
                },

                // Strings
                {
                    token: "string",
                    regex: /"([^\\"]|\\.)*"/
                },
                // CPU registers
                {
                    token: "support.constant",
                    regex: "\\b(?:A|B|DPTR|SP|PC|R[0-7])\\b",
                    caseInsensitive: true
                },

                // SFR
                {
                    token: "support.constant",
                    regex: sfrRegex,
                       /* "\\b(?:"
                        + "ACC|PSW|DPL|DPH|"
                        + "P0|P1|P2|P3|"
                        + "TCON|TMOD|TL0|TH0|TL1|TH1|"
                        + "SCON|SBUF|IE|IP"
                        + ")\\b",*/
                    caseInsensitive: true
                },
            ]
        };

        this.normalizeRules();
    };

    oop.inherits(
        Assembly8051HighlightRules,
        TextHighlightRules
    );

    exports.Assembly8051HighlightRules =
        Assembly8051HighlightRules;
});

ace.define("ace/mode/assembly_8051", [
    "require",
    "exports",
    "module",
    "ace/lib/oop",
    "ace/mode/text",
    "ace/mode/assembly_8051_highlight_rules"
], function(require, exports, module) {

    const oop = require("../lib/oop");
    const TextMode = require("./text").Mode;

    const Assembly8051HighlightRules =
        require("./assembly_8051_highlight_rules")
            .Assembly8051HighlightRules;

    const Mode = function() {
        this.HighlightRules = Assembly8051HighlightRules;
        this.$behaviour = this.$defaultBehaviour;
    };

    oop.inherits(Mode, TextMode);

    (function() {
        this.lineCommentStart = [";"];
        this.$id = "ace/mode/assembly_8051";
    }).call(Mode.prototype);

    exports.Mode = Mode;
});