ace.define("ace/mode/folding-assembly_8051", [
    "require",
    "exports",
    "module",
    "ace/range",
    "ace/mode/folding/fold_mode"
], function(require, exports, module) {

    const Range = require("ace/range").Range;
    const BaseFoldMode =
        require("ace/mode/folding/fold_mode").FoldMode;

    const Assembly8051FoldMode = function() {
    };

    Assembly8051FoldMode.prototype =
        Object.create(BaseFoldMode.prototype);


    const labelRegex =
        /^\s*[A-Za-z_][\w.]*:\s*(?:;.*)?$/;


    Assembly8051FoldMode.prototype.getFoldWidget =
        function(session, foldStyle, row) {

            if (labelRegex.test(session.getLine(row))) {
                return "start";
            }

            return "";
        };


    Assembly8051FoldMode.prototype.getFoldWidgetRange =
    function(session, foldStyle, row) {

        const line = session.getLine(row);

        if (!labelRegex.test(line)) {
            return null;
        }

        const lastRow = session.getLength() - 1;

        for (let r = row + 1; r <= lastRow; r++) {

            if (labelRegex.test(session.getLine(r))) {

                return new Range(
                    row,
                    line.length,
                    r - 1,
                    session.getLine(r - 1).length
                );
            }
        }

        if (lastRow > row) {

            return new Range(
                row,
                line.length,
                lastRow,
                session.getLine(lastRow).length
            );
        }

        return null;
    };
    exports.FoldMode = Assembly8051FoldMode;
});