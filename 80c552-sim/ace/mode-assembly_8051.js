

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

    const FoldMode =
        require("./folding-assembly_8051").FoldMode;

    const Mode = function() {
        this.HighlightRules = Assembly8051HighlightRules;
        this.foldingRules = new FoldMode();
        this.$behaviour = this.$defaultBehaviour;
    };

    oop.inherits(Mode, TextMode);

    (function() {
        this.lineCommentStart = [";"];
        this.$id = "ace/mode/assembly_8051";
    }).call(Mode.prototype);

    exports.Mode = Mode;
});