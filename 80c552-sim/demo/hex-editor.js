/* ==========================================================================
   ModalHexEditor
   --------------------------------------------------------------------------
   A dependency-free, vim-modal hex editor for fixed-size byte buffers
   (built for editing 8051 / 80C552 CODE-space ROM dumps, e.g. the REGO600
   27SF512 image, inside a js51-based simulator UI).

   This build creates its own DOM tree (no fixed ids, no reliance on
   pre-existing host markup) and every CSS class is prefixed "mhe-" and
   scoped under the root ".mhe-editor" element in modal-hex-editor.css, so
   it can be dropped into a page with its own styling without collisions.
   Multiple instances on one page are safe.

   USAGE
   -----
     <link rel="stylesheet" href="modal-hex-editor.css">
     <script src="modal-hex-editor.js"></script>
     <div id="hexHost" style="width:900px;height:560px;"></div>
     <script>
       const ed = new ModalHexEditor(document.getElementById('hexHost'), {
         size: 0x10000,                 // byte length of the buffer (fixed)
         data: someUint8ArrayOrNull,    // optional initial contents
         bytesPerRow: 16,
         onChange(addr, value, bytes) { // fires once per byte written
           sim.codeMem[addr] = value;   // <-- wire into your simulator here
         },
         onSave(bytes) {                // fires on ':w' or Export button
           downloadOrPushToSimulator(bytes);
         }
       });
     </script>

   The component gives itself an explicit height/width by default — 100%
   of its container — and watches its own box with a ResizeObserver, so
   resizing/dragging a modal around it re-flows the row virtualization
   automatically. This requires the container element you pass in to
   actually change size itself (e.g. your modal sets its body's
   width/height as the user drags) — the editor just follows it. If your
   environment doesn't fire ResizeObserver reliably, call ed.refresh()
   from your own resize handler as an explicit fallback (see PUBLIC API).

   PUBLIC API
   ----------
     ed.loadBytes(uint8array)              replace contents, resets undo
     ed.getBytes()                         -> Uint8Array (live buffer)
     ed.setByte(addr, val)                 programmatic single write
     ed.jumpTo(addr)
     ed.addBookmark(addr, label, color?)
     ed.removeBookmark(addr)
     ed.highlightRange(start, end, label, color?)
     ed.refresh()                          force re-layout (see note above)
     ed.destroy()                          removes listeners + DOM

   OPTIONS
   -------
     height  CSS height for the editor's own root element. Default '100%'
             — the container you pass in must therefore have a real,
             changing size (e.g. set by your modal on resize).
     width   CSS width for the editor's own root element. Default '100%'.
   ========================================================================== */

(function (global) {
  'use strict';

  class ModalHexEditor {
    static Modes = {
        Normal:'NORMAL',
        Visual:'VISUAL',
        Command:'COMMAND',
        Insert:'INSERT'
    };

    constructor(root, opts = {}) {
      
      this.container = root;
      this.bytesPerRow = opts.bytesPerRow || 16;
      this.size = opts.size || 0x10000;
      this.data = opts.data ? Uint8Array.from(opts.data).slice(0, this.size) : new Uint8Array(this.size).fill(0xFF);
      if (this.data.length < this.size) {
        const padded = new Uint8Array(this.size).fill(0xFF);
        padded.set(this.data);
        this.data = padded;
      }
      this.original = this.data.slice(); // for "modified" diff highlighting
      this.onChange = opts.onChange || (() => {});
      this.onSave = opts.onSave || (() => {});
      this.onLoad = opts.onLoad || (() => {});
      this.fileName = opts.fileName || 'untitled';
      this.heightOpt = opts.height || '100%';
      this.widthOpt = opts.width || '100%';

      // editor state
      if (opts.mode != undefined) {
        this.mode = opts.mode;
      } else {
        this.mode = ModalHexEditor.Modes.Normal;
      }
      this.pane = 'hex';           // 'hex' | 'ascii'
      this.cursor = 0;
      this.selAnchor = null;       // visual-mode anchor
      this.lastSelection = null;   // [start,end] retained after leaving visual, for :fill
      this.pendingNibble = null;   // high nibble typed in INSERT (hex pane)
      this.pendingG = false;
      this.yankBuffer = null;
      this.undoStack = [];
      this.redoStack = [];
      this.dirty = false;
      this.bookmarks = new Map();  // addr -> {label, color}
      this.regions = [];           // {start,end,label,color}
      this.searchMatches = [];
      this.searchIndex = -1;
      this.searchNeedleLen = 0;
      this.cmdPrefix = '';         // ':' or '/'
      this.cmdBuffer = '';
      this.msg = '';

      this.rowHeight = 22;
      this.overscan = 6;

      this._buildDom();
      this._bindEvents();
      this._render();
    }

    /* ---------------- public API ---------------- */

    loadBytes(bytes, { resetUndo = true, fileName } = {}) {
      const arr = Uint8Array.from(bytes).slice(0, this.size);
      this.data = new Uint8Array(this.size).fill(0xFF);
      this.data.set(arr);
      this.original = this.data.slice();
      if (resetUndo) { this.undoStack = []; this.redoStack = []; }
      this.cursor = 0;
      this.dirty = false;
      if (fileName) this.fileName = fileName;
      this._syncDirty();
      this._render();
    }

    getBytes() { return this.data.slice(); }

    setByte(addr, val) {
      if (addr < 0 || addr >= this.size) return;
      this._applyEdits([{ addr, next: val & 0xFF }]);
      this._render();
    }

    jumpTo(addr) {
        if (!Number.isInteger(addr)) {
          throw new TypeError(`Invalid address: ${addr}`);
      }
      this.cursor = this._clamp(addr, 0, this.size - 1);
      this._ensureVisible();
      this._render();
    }

    addBookmark(addr, label, color) {
      this.bookmarks.set(addr, { label, color: color || '#ffb400' });
      this._render();
    }

    removeBookmark(addr) { this.bookmarks.delete(addr); this._render(); }

    highlightRange(start, end, label, color) {
      this.regions.push({ start, end, label, color: color || '#9d7cd8' });
      this._render();
    }

    destroy() {
      this._unbindEvents();
      this.container.innerHTML = '';
    }

    /**
     * Force a re-layout/re-render. The editor already does this on its own
     * via ResizeObserver whenever its box size changes, so you normally
     * never need to call this. It's here as an explicit, zero-guesswork
     * fallback for host code that resizes/moves a modal in a way that
     * doesn't trigger a ResizeObserver callback in your environment, or
     * that simply prefers to signal "the parent changed size" itself
     * (e.g. from your own resize/drag-end handler) rather than rely on it.
     */
    refresh() { this._render(); }

    /* ---------------- DOM setup ---------------- */

    _el(tag, className, text) {
      const e = document.createElement(tag);
      if (className) e.className = className;
      if (text !== undefined) e.textContent = text;
      return e;
    }

    _buildDom() {
      this.container.innerHTML = '';
      const root = this._el('div', 'mhe-editor');
      root.tabIndex = -1;
      // Self-contained sizing: don't depend on the host giving us a
      // definite height (a modal body often doesn't). Overridable via
      // opts.height / opts.width, or afterwards via ed.root.style.*
      root.style.height = this.heightOpt;
      root.style.width = this.widthOpt;

      // toolbar
      const toolbar = this._el('div', 'mhe-toolbar');
      const brand = this._el('span', 'mhe-brand', 'Code Mem');
      this.fnameEl = this._el('span', 'mhe-fname', `${this.fileName} — ${this.size} bytes (0x${this.size.toString(16)})`);
      this.dirtyDot = this._el('span', 'mhe-dirty-dot');
      this.dirtyDot.title = 'unsaved changes';
      this.btnOpen = this._el('button', 'mhe-btn', 'Open .bin');
      this.btnOpen.type = 'button';
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.style.display = 'none';
      this.btnExport = this._el('button', 'mhe-btn', 'Export .bin');
      this.btnExport.type = 'button';
      this.btnHelp = this._el('button', 'mhe-btn', '? Help');
      this.btnHelp.type = 'button';
      toolbar.append(brand, this.fnameEl, this.dirtyDot, this.btnOpen, this.fileInput, this.btnExport, this.btnHelp);

      // column header
      const colheader = this._el('div', 'mhe-colheader');
      const addrCol = this._el('div', 'mhe-addr-col', 'ADDRESS');
      const hexCol = this._el('div', 'mhe-hex-col');
      for (let i = 0; i < this.bytesPerRow; i++) {
        const s = this._el('span', 'mhe-hex-col-label' + (i % 8 === 7 ? ' mhe-grp' : ''), i.toString(16).padStart(2, '0').toUpperCase());
        hexCol.appendChild(s);
      }
      const asciiCol = this._el('div', 'mhe-ascii-col', 'ASCII');
      colheader.append(addrCol, hexCol, asciiCol);

      // viewport
      this.viewport = this._el('div', 'mhe-viewport');
      this.viewport.tabIndex = 0;
      this.sizer = this._el('div', 'mhe-sizer');
      this.rowsEl = this._el('div', 'mhe-rows');
      this.sizer.appendChild(this.rowsEl);
      this.viewport.appendChild(this.sizer);

      // help overlay
      this.helpEl = this._el('div', 'mhe-help');
      const helpCard = this._el('div', 'mhe-help-card');
      helpCard.appendChild(this._el('h2', 'mhe-help-title', 'Modal Hex Editor — Keybindings'));
      const table = document.createElement('table');
      table.className = 'mhe-help-table';
      const rows = [
        ['h j k l / arrows', 'move cursor (byte / row)'],
        ['0   $', 'start / end of row'],
        ['gg   G', 'jump to start / end of memory'],
        ['Ctrl-D / Ctrl-U', 'scroll half page down / up'],
        ['Tab', 'switch focus between hex pane and ASCII pane'],
        ['i', 'enter INSERT mode at cursor (overwrite byte)'],
        ['Esc', 'back to NORMAL mode'],
        ['x', 'zero the byte under cursor'],
        ['v', 'enter VISUAL mode (select range)'],
        ['y (visual)', 'yank selection'],
        ['x / d (visual)', 'zero-fill selection'],
        ['p', 'paste yanked bytes at cursor'],
        ['u   Ctrl-R', 'undo / redo'],
        ['/ text Enter', 'search hex bytes, e.g. /de ad be ef'],
        ['/"text Enter', 'search ASCII text, e.g. /"REGO'],
        ['n   N', 'next / previous search match'],
        [': addr Enter', 'goto address, e.g. :1efc or :0x1efc'],
        [':mark label', 'bookmark cursor address'],
        [':unmark', 'remove bookmark at cursor'],
        [':fill xx', 'fill last visual selection with byte xx'],
        [':w', 'fire onSave callback (export hook)'],
        ['?', 'toggle this help'],
      ];
      for (const [k, v] of rows) {
        const tr = document.createElement('tr');
        const td1 = this._el('td', 'mhe-help-key', k);
        const td2 = this._el('td', '', v);
        tr.append(td1, td2);
        table.appendChild(tr);
      }
      helpCard.appendChild(table);
      helpCard.appendChild(this._el('div', 'mhe-help-hint', 'Click outside this card, or press ? again, to close.'));
      this.helpEl.appendChild(helpCard);
      this.viewport.appendChild(this.helpEl);

      // status bar
      const status = this._el('div', 'mhe-status');
      this.modeBadge = this._el('span', 'mhe-mode mhe-mode-normal', 'NORMAL');
      this.stAddr = this._el('span', '', '');
      this.stAddr.append('addr ', (this._stAddrVal = this._el('span', 'mhe-addrval', '0x0000')));
      this.stByte = this._el('span', '', '');
      this.stSel = this._el('span', '', '');
      this.cmdline = this._el('span', 'mhe-cmdline', '');
      this.stMsg = this._el('span', 'mhe-msg', '');
      status.append(this.modeBadge, this.stAddr, this.stByte, this.stSel, this.cmdline, this.stMsg);

      root.append(toolbar, colheader, this.viewport, status);
      this.container.appendChild(root);
      this.root = root;

      const totalRows = Math.ceil(this.size / this.bytesPerRow);
      this.sizer.style.height = (totalRows * this.rowHeight) + 'px';

      this.helpCard = helpCard;
    }

    _bindEvents() {
      this._onScroll = () => this._render();
      this._onKeydown = (e) => this._handleKeydown(e);
      this._onClick = (e) => this._handleClick(e);

      this.viewport.addEventListener('scroll', this._onScroll);
      this.viewport.addEventListener('keydown', this._onKeydown);
      this.viewport.addEventListener('mousedown', this._onClick);

      // Re-flow row virtualization whenever our actual box size changes —
      // covers a modal that mounts/opens/resizes/drags after construction,
      // when the viewport goes from 0 (or wrong) size to its real one.
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this._render());
        this._ro.observe(this.viewport);
      }

      this._onHelpBtn = () => this._toggleHelp();
      this.btnHelp.addEventListener('click', this._onHelpBtn);

      this._onHelpBackdrop = (e) => { if (e.target === this.helpEl) this._toggleHelp(false); };
      this.helpEl.addEventListener('mousedown', this._onHelpBackdrop);

      this._onOpenClick = () => this.fileInput.click();
      this.btnOpen.addEventListener('click', this._onOpenClick);

      this._onFileChange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const buf = new Uint8Array(await f.arrayBuffer());
        this.loadBytes(buf, { fileName: f.name });
        this.fnameEl.textContent = `${f.name} — ${this.size} bytes (0x${this.size.toString(16)})`;
        this.msg = `loaded ${f.name} (${buf.length} bytes)`;
        this._render();
        this.onLoad(buf, { fileName: f.name });
      };
      this.fileInput.addEventListener('change', this._onFileChange);

      this._onExportClick = () => this._exportFile();
      this.btnExport.addEventListener('click', this._onExportClick);
    }

    _unbindEvents() {
      if (this._ro) this._ro.disconnect();
      this.viewport.removeEventListener('scroll', this._onScroll);
      this.viewport.removeEventListener('keydown', this._onKeydown);
      this.viewport.removeEventListener('mousedown', this._onClick);
      this.btnHelp.removeEventListener('click', this._onHelpBtn);
      this.helpEl.removeEventListener('mousedown', this._onHelpBackdrop);
      this.btnOpen.removeEventListener('click', this._onOpenClick);
      this.fileInput.removeEventListener('change', this._onFileChange);
      this.btnExport.removeEventListener('click', this._onExportClick);
    }

    /* ---------------- input handling ---------------- */

    _handleClick(e) {
      const cell = e.target.closest('.mhe-hexcell,.mhe-asciicell');
      if (!cell) return;
      const addr = parseInt(cell.dataset.addr, 10);
      if (Number.isNaN(addr)) return;
      this.pane = cell.classList.contains('mhe-asciicell') ? 'ascii' : 'hex';
      this.cursor = addr;
      if (this.mode === ModalHexEditor.Modes.Visual && this.selAnchor === null) this.selAnchor = addr;
      this.viewport.focus();
      this._render();
    }

    _handleKeydown(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key;
      if (ctrl && (k === 'y' || k === 'Y')) { e.preventDefault(); this._redo(); return; }
      if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); this._undo(); return; }

      if (e.key === '?' && this.mode === ModalHexEditor.Modes.Normal) { e.preventDefault(); this._toggleHelp(); return; }
      if (this.helpEl.classList.contains('mhe-show')) {
        if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); this._toggleHelp(false); }
        return;
      }

      if (this.mode === ModalHexEditor.Modes.Command) return this._onCommandKey(e);
      if (this.mode === ModalHexEditor.Modes.Insert) return this._onInsertKey(e);
      return this._onNormalKey(e, ctrl);
    }

    _onNormalKey(e, ctrl) {
      const k = e.key;

      if (ctrl && (k === 'd' || k === 'D')) { e.preventDefault(); this._move(this.bytesPerRow * 8); return; }
      if (ctrl && (k === 'u' || k === 'U')) { e.preventDefault(); this._move(-this.bytesPerRow * 8); return; }
      if (ctrl && (k === 'f' || k === 'F')) { e.preventDefault(); this._move(this.bytesPerRow * 16); return; }
      if (ctrl && (k === 'b' || k === 'B')) { e.preventDefault(); this._move(-this.bytesPerRow * 16); return; }
      

      switch (k) {
        case 'h': case 'ArrowLeft':  e.preventDefault(); this._move(-1); return;
        case 'l': case 'ArrowRight': e.preventDefault(); this._move(1); return;
        case 'j': case 'ArrowDown':  e.preventDefault(); this._move(this.bytesPerRow); return;
        case 'k': case 'ArrowUp':    e.preventDefault(); this._move(-this.bytesPerRow); return;
        case '0': e.preventDefault(); this._moveTo(this.cursor - (this.cursor % this.bytesPerRow)); return;
        case '$': e.preventDefault(); this._moveTo(this.cursor - (this.cursor % this.bytesPerRow) + this.bytesPerRow - 1); return;
        case 'g':
          e.preventDefault();
          if (this.pendingG) { this.pendingG = false; this._moveTo(0); }
          else { this.pendingG = true; setTimeout(() => this.pendingG = false, 600); }
          return;
        case 'G': e.preventDefault(); this._moveTo(this.size - 1); return;
        case 'Tab':
          e.preventDefault();
          this.pane = this.pane === 'hex' ? 'ascii' : 'hex';
          this._render();
          return;
        case 'Escape':
          e.preventDefault();
          if (this.mode === ModalHexEditor.Modes.Visual) { this.lastSelection = this._selRange(); this.selAnchor = null; this.mode = ModalHexEditor.Modes.Normal; }
          this.msg = '';
          this._render();
          return;
        case 'i':
          e.preventDefault();
          this.mode = ModalHexEditor.Modes.Insert; this.pendingNibble = null; this._render();
          return;
        case 'v':
          e.preventDefault();
          if (this.mode === ModalHexEditor.Modes.Visual) { this.lastSelection = this._selRange(); this.selAnchor = null; this.mode = 'NORMAL'; }
          else { this.mode = ModalHexEditor.Modes.Visual; this.selAnchor = this.cursor; }
          this._render();
          return;
        case 'x':
          e.preventDefault();
          if (this.mode === ModalHexEditor.Modes.Visual) this._fillSelection(0x00);
          else this._applyEdits([{ addr: this.cursor, next: 0x00 }]);
          this._render();
          return;
        case 'd':
          e.preventDefault();
          if (this.mode === ModalHexEditor.Modes.Visual) this._fillSelection(0x00);
          return;
        case 'y':
          e.preventDefault();
          if (this.mode === ModalHexEditor.Modes.Visual) {
            const [s, en] = this._selRange();
            this.yankBuffer = this.data.slice(s, en + 1);
            this.lastSelection = [s, en];
            this.msg = `yanked ${this.yankBuffer.length} byte(s)`;
            this.selAnchor = null; this.mode = 'NORMAL';
          }
          this._render();
          return;
        case 'p':
          e.preventDefault();
          if (this.yankBuffer && this.yankBuffer.length) {
            const edits = [];
            for (let i = 0; i < this.yankBuffer.length && this.cursor + i < this.size; i++) {
              edits.push({ addr: this.cursor + i, next: this.yankBuffer[i] });
            }
            this._applyEdits(edits);
            this.msg = `pasted ${edits.length} byte(s)`;
          }
          this._render();
          return;
        case 'm':
          e.preventDefault();
          this.mode = ModalHexEditor.Modes.Command; this.cmdPrefix = ':'; this.cmdBuffer = 'mark ';
          this._render();
          return;
        case 'u':
          e.preventDefault(); this._undo(); return;
        case '/':
          e.preventDefault();
          this.mode = ModalHexEditor.Modes.Command; this.cmdPrefix = '/'; this.cmdBuffer = '';
          this._render();
          return;
        case ':':
          e.preventDefault();
          this.mode = ModalHexEditor.Modes.Command; this.cmdPrefix = ':'; this.cmdBuffer = '';
          this._render();
          return;
        case 'n':
          e.preventDefault(); this._searchStep(1); return;
        case 'N':
          e.preventDefault(); this._searchStep(-1); return;
        default:
          return;
      }
    }

    _onInsertKey(e) {
      

      if (e.key === 'Escape') { e.preventDefault(); this.mode = 'NORMAL'; this.pendingNibble = null; this._render(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        this.pane = this.pane === 'hex' ? 'ascii' : 'hex';
        this.pendingNibble = null;
        this._render();
        return;
      }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); this._move(-1); this.pendingNibble = null; return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); this._move(1);  this.pendingNibble = null; return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); this._move(-this.bytesPerRow); this.pendingNibble = null; return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); this._move(this.bytesPerRow);  this.pendingNibble = null; return; }

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (this.pendingNibble !== null) { this.pendingNibble = null; }
        else { this._move(-1); }
        this._render();
        return;
      }

      if (this.pane === 'hex') {
        if (/^[0-9a-fA-F]$/.test(e.key)) {
          e.preventDefault();
          if (this.pendingNibble === null) {
            this.pendingNibble = e.key.toLowerCase();
          } else {
            const val = parseInt(this.pendingNibble + e.key, 16);
            this._applyEdits([{ addr: this.cursor, next: val }]);
            this.pendingNibble = null;
            this._moveTo(Math.min(this.cursor + 1, this.size - 1));
          }
          this._render();
        }
        return;
      }

      // ascii pane: any single printable char overwrites directly
      if (e.key.length === 1) {
        e.preventDefault();
        const code = e.key.charCodeAt(0) & 0xFF;
        this._applyEdits([{ addr: this.cursor, next: code }]);
        this._moveTo(Math.min(this.cursor + 1, this.size - 1));
        this._render();
      }
    }

    _onCommandKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.mode = 'NORMAL'; this.cmdBuffer = ''; this._render();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this._execCommand(this.cmdPrefix, this.cmdBuffer.trim());
        this.mode = 'NORMAL'; this.cmdBuffer = '';
        this._render();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        this.cmdBuffer = this.cmdBuffer.slice(0, -1);
        this._render();
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        this.cmdBuffer += e.key;
        this._render();
      }
    }

    /* ---------------- command / search execution ---------------- */

    _execCommand(prefix, text) {
      if (prefix === '/') return this._runSearch(text);

      if (!text) return;
      const [cmd, ...rest] = text.split(/\s+/);
      const argStr = rest.join(' ');

      if (/^(0x)?[0-9a-fA-F]+$/.test(cmd) && rest.length === 0) {
        const addr = parseInt(cmd.replace(/^0x/i, ''), 16);
        if (!Number.isNaN(addr)) { this.jumpTo(addr); this.msg = `goto 0x${addr.toString(16)}`; }
        return;
      }

      if (cmd === 'w') {
        this.onSave(this.getBytes());
        this.dirty = false;
        this._syncDirty();
        this.msg = 'saved (onSave fired)';
        return;
      }

      if (cmd === 'mark') {
        const label = argStr || `mark@0x${this.cursor.toString(16)}`;
        this.addBookmark(this.cursor, label);
        this.msg = `bookmarked 0x${this.cursor.toString(16).padStart(4, '0')}: ${label}`;
        return;
      }

      if (cmd === 'unmark') {
        this.removeBookmark(this.cursor);
        this.msg = 'bookmark removed';
        return;
      }

      if (cmd === 'fill') {
        const val = parseInt(argStr.replace(/^0x/i, ''), 16);
        if (Number.isNaN(val)) { this.msg = 'usage: :fill <hex byte>'; return; }
        const range = this.lastSelection || [this.cursor, this.cursor];
        const edits = [];
        for (let a = range[0]; a <= range[1]; a++) edits.push({ addr: a, next: val & 0xFF });
        this._applyEdits(edits);
        this.msg = `filled 0x${range[0].toString(16)}-0x${range[1].toString(16)} with ${val.toString(16).padStart(2, '0')}`;
        return;
      }

      this.msg = `unknown command: ${cmd}`;
    }

    _runSearch(query) {
      if (!query) { this.msg = ''; return; }
      let needle;
      if (query.startsWith('"')) {
        const text = query.slice(1);
        needle = Uint8Array.from([...text].map(c => c.charCodeAt(0) & 0xFF));
      } else {
        const hex = query.replace(/\s+/g, '');
        if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
          this.msg = 'search: give hex bytes ("de ad be ef") or "text';
          return;
        }
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
        needle = Uint8Array.from(bytes);
      }
      if (!needle.length) { this.msg = 'empty search'; return; }

      const matches = [];
      outer:
      for (let i = 0; i <= this.size - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
          if (this.data[i + j] !== needle[j]) continue outer;
        }
        matches.push(i);
      }
      this.searchMatches = matches;
      this.searchNeedleLen = needle.length;
      if (!matches.length) { this.msg = 'no matches'; this.searchIndex = -1; return; }

      let idx = matches.findIndex(a => a >= this.cursor);
      if (idx === -1) idx = 0;
      this.searchIndex = idx;
      this.jumpTo(matches[idx]);
      this.msg = `match ${idx + 1}/${matches.length} at 0x${matches[idx].toString(16)}`;
    }

    _searchStep(dir) {
      if (!this.searchMatches.length) { this.msg = 'no search yet'; this._render(); return; }
      this.searchIndex = (this.searchIndex + dir + this.searchMatches.length) % this.searchMatches.length;
      const addr = this.searchMatches[this.searchIndex];
      this.jumpTo(addr);
      this.msg = `match ${this.searchIndex + 1}/${this.searchMatches.length} at 0x${addr.toString(16)}`;
      this._render();
    }

    /* ---------------- editing / undo ---------------- */

    _applyEdits(edits) {
      if (!edits.length) return;
      const batch = edits.map(({ addr, next }) => ({ addr, prev: this.data[addr], next }));
      for (const e of batch) { this.data[e.addr] = e.next; this.onChange(e.addr, e.next, this.data); }
      this.undoStack.push(batch);
      this.redoStack = [];
      this.dirty = true;
      this._syncDirty();
    }

    _undo() {
      
      const batch = this.undoStack.pop();
      if (!batch) { this.msg = 'nothing to undo'; this._render(); return; }
      for (const e of batch) { this.data[e.addr] = e.prev; this.onChange(e.addr, e.prev, this.data); }
      this.redoStack.push(batch);
      this.msg = `undo (${batch.length} byte${batch.length > 1 ? 's' : ''})`;
      this.dirty = this.undoStack.length > 0;
      this._syncDirty();
      this._render();
    }

    _redo() {
      const batch = this.redoStack.pop();
      if (!batch) { this.msg = 'nothing to redo'; this._render(); return; }
      for (const e of batch) { this.data[e.addr] = e.next; this.onChange(e.addr, e.next, this.data); }
      this.undoStack.push(batch);
      this.msg = `redo (${batch.length} byte${batch.length > 1 ? 's' : ''})`;
      this.dirty = true;
      this._syncDirty();
      this._render();
    }

    _fillSelection(val) {
      const [s, en] = this._selRange();
      const edits = [];
      for (let a = s; a <= en; a++) edits.push({ addr: a, next: val });
      this._applyEdits(edits);
      this.lastSelection = [s, en];
      this.cursor = s;
      this.selAnchor = null;
      this.mode = 'NORMAL';
    }

    _syncDirty() { this.dirtyDot.classList.toggle('mhe-on', this.dirty); }

    /* ---------------- navigation helpers ---------------- */

    _move(delta) { this._moveTo(this.cursor + delta); }

    _moveTo(addr) {
      this.cursor = this._clamp(addr, 0, this.size - 1);
      this._ensureVisible();
      this._render();
    }

    _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    _selRange() {
      if (this.selAnchor === null) return [this.cursor, this.cursor];
      return [Math.min(this.selAnchor, this.cursor), Math.max(this.selAnchor, this.cursor)];
    }

    _ensureVisible() {
      const row = Math.floor(this.cursor / this.bytesPerRow);
      const rowTop = row * this.rowHeight;
      const rowBottom = rowTop + this.rowHeight;
      const viewTop = this.viewport.scrollTop;
      const viewBottom = viewTop + this.viewport.clientHeight;
      if (rowTop < viewTop) this.viewport.scrollTop = rowTop;
      else if (rowBottom > viewBottom) this.viewport.scrollTop = rowBottom - this.viewport.clientHeight;
    }

    _regionFor(addr) {
      for (const r of this.regions) if (addr >= r.start && addr <= r.end) return r;
      return null;
    }

    /* ---------------- rendering ---------------- */

    _toggleHelp(force) {
      const show = force !== undefined ? force : !this.helpEl.classList.contains('mhe-show');
      this.helpEl.classList.toggle('mhe-show', show);
    }

    _exportFile() {
      const blob = new Blob([this.getBytes()], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (this.fileName.replace(/\.bin$/i, '') || 'codemem') + '_export.bin';
      a.click();
      URL.revokeObjectURL(a.href);
      this.onSave(this.getBytes());
      this.dirty = false;
      this._syncDirty();
      this.msg = 'exported ' + a.download;
      this._render();
    }

    _render() {
      // status bar
      this.modeBadge.textContent = this.mode;
      this.modeBadge.className = 'mhe-mode mhe-mode-' + this.mode.toLowerCase();
      this._stAddrVal.textContent = '0x' + this.cursor.toString(16).padStart(4, '0').toUpperCase();
      const b = this.data[this.cursor];
      const ch = (b >= 32 && b < 127) ? String.fromCharCode(b) : '.';
      this.stByte.textContent = `byte ${b.toString(16).padStart(2, '0').toUpperCase()}  dec ${b}  bin ${b.toString(2).padStart(8, '0')}  '${ch}'`;
      if (this.mode === ModalHexEditor.Modes.Visual) {
        const [s, en] = this._selRange();
        this.stSel.textContent = `sel 0x${s.toString(16)}-0x${en.toString(16)} (${en - s + 1}B)`;
      } else {
        this.stSel.textContent = this.lastSelection ? `last-sel 0x${this.lastSelection[0].toString(16)}-0x${this.lastSelection[1].toString(16)}` : '';
      }
      const region = this._regionFor(this.cursor);
      this.stMsg.textContent = this.msg || (region ? `region: ${region.label}` : '');

      if (this.mode === ModalHexEditor.Modes.Command) {
        this.cmdline.innerHTML = '';
        const prefix = this._el('span', 'mhe-prefix', this.cmdPrefix);
        this.cmdline.append(prefix, this.cmdBuffer, this._el('span', '', '\u258C'));
      } else if (this.mode === ModalHexEditor.Modes.Insert && this.pendingNibble !== null) {
        this.cmdline.textContent = `nibble: ${this.pendingNibble}_`;
      } else {
        this.cmdline.textContent = '';
      }

      // virtualized row rendering
      const totalRows = Math.ceil(this.size / this.bytesPerRow);
      const scrollTop = this.viewport.scrollTop;
      const first = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.overscan);
      const visibleCount = Math.ceil(this.viewport.clientHeight / this.rowHeight) + this.overscan * 2;
      const last = Math.min(totalRows - 1, first + visibleCount);

      this.rowsEl.style.transform = `translateY(${first * this.rowHeight}px)`;
      const frag = document.createDocumentFragment();
      const [selS, selE] = this.mode === ModalHexEditor.Modes.Visual ? this._selRange() : [-1, -1];
      const matchSet = this.searchMatches.length ? new Set() : null;
      if (matchSet && this.searchNeedleLen) {
        const winStart = first * this.bytesPerRow, winEnd = (last + 1) * this.bytesPerRow;
        for (const m of this.searchMatches) {
          if (m + this.searchNeedleLen < winStart || m > winEnd) continue;
          for (let k = 0; k < this.searchNeedleLen; k++) matchSet.add(m + k);
        }
      }

      for (let r = first; r <= last; r++) {
        const rowAddr = r * this.bytesPerRow;
        const rowEl = this._el('div', 'mhe-row' + (this._regionFor(rowAddr) ? ' mhe-region' : ''));
        rowEl.style.height = this.rowHeight + 'px';

        const addrEl = this._el('div', 'mhe-addr', '0x' + rowAddr.toString(16).padStart(4, '0').toUpperCase());
        for (const [bAddr, bm] of this.bookmarks) {
          if (bAddr >= rowAddr && bAddr < rowAddr + this.bytesPerRow) {
            const tri = this._el('span', 'mhe-bm');
            tri.title = `0x${bAddr.toString(16)}: ${bm.label}`;
            addrEl.appendChild(tri);
            break;
          }
        }
        rowEl.appendChild(addrEl);

        const asciiChars = [];
        for (let c = 0; c < this.bytesPerRow; c++) {
          const addr = rowAddr + c;
          if (addr >= this.size) break;
          const val = this.data[addr];

          const hc = this._el('div', 'mhe-hexcell' + (c % 8 === 7 ? ' mhe-grp' : ''));
          hc.dataset.addr = addr;
          hc.textContent = (addr === this.cursor && this.mode === ModalHexEditor.Modes.Insert && this.pendingNibble !== null)
            ? this.pendingNibble.toUpperCase() + '_'
            : val.toString(16).padStart(2, '0').toUpperCase();
          if (val !== this.original[addr]) hc.classList.add('mhe-modified');
          if (addr >= selS && addr <= selE) hc.classList.add('mhe-sel');
          if (matchSet && matchSet.has(addr)) hc.classList.add('mhe-match');
          if (addr === this.cursor) hc.classList.add('mhe-cursor');
          rowEl.appendChild(hc);

          const ac = this._el('div', 'mhe-asciicell');
          ac.dataset.addr = addr;
          ac.textContent = (val >= 32 && val < 127) ? String.fromCharCode(val) : '.';
          if (val !== this.original[addr]) ac.classList.add('mhe-modified');
          if (addr >= selS && addr <= selE) ac.classList.add('mhe-sel');
          if (matchSet && matchSet.has(addr)) ac.classList.add('mhe-match');
          if (addr === this.cursor) ac.classList.add('mhe-cursor');
          asciiChars.push(ac);
        }

        const asciiWrap = this._el('div', 'mhe-ascii');
        asciiChars.forEach(el => asciiWrap.appendChild(el));
        rowEl.appendChild(asciiWrap);
        if (this.pane === 'ascii') rowEl.classList.add('mhe-pane-dim');

        frag.appendChild(rowEl);
      }
      this.rowsEl.innerHTML = '';
      this.rowsEl.appendChild(frag);
    }
  }

  global.ModalHexEditor = ModalHexEditor;
})(window);
