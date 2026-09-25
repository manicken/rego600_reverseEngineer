/**
 * VirtualScroller - generic virtualized list for large datasets where only
 * a window of rows exists in the DOM at any given time.
 *
 * Extracted from the disassembly view's row pooling
 * (buildPoolRow/bindPoolRow/renderVisibleDisasmRows/onDisasmScroll/
 * onDisasmResize, etc.). All logic specific to instructions/labels/
 * breakpoints has been removed - what you bind through createRow/bindRow
 * determines what a row actually displays.
 *
 * Usage:
 *
 *   const vs = new VirtualScroller({
 *     viewportEl,   // the scrolling element
 *     sizerEl,      // child of viewportEl - gets position:relative + correct total height
 *     createRow,    // () => { el, ...any custom state } - creates an unbound DOM row
 *     bindRow,      // (row, item, index) => void - sets content/position/classes
 *     unbindRow,    // (row) => void - (optional) clean up when the row is hidden
 *     bufferRows: 8,
 *     rowHeight: 20, // initial estimate, can be measured automatically (see measureRowHeight)
 *   });
 *
 *   vs.setItems(items);      // replace the entire dataset, rebuild sizer height + pool
 *   vs.measureRowHeight();   // (optional) measure actual row height using two test rows
 *   vs.scrollToIndex(42);
 *   vs.refresh();            // re-render the visible window without changing scroll
 *                             // (e.g. after a selection change)
 */
class VirtualScroller {
    constructor({ 
        viewportEl, 
        sizerEl, 
        createRow, 
        bindRow, 
        unbindRow = null, 
        bufferRows = 8, 
        rowHeight = 20,
        onScrollEnd = null
    }) {
        this.viewportEl = viewportEl;
        this.sizerEl = sizerEl ?? createNewElement("div");
        this.viewportEl.appendChild(this.sizerEl);
        this.onScrollEnd = onScrollEnd;
        
        this.createRow = createRow;
        this.bindRow = bindRow;
        this.unbindRow = unbindRow;
        this.bufferRows = bufferRows;
        this.rowHeight = rowHeight;

        this.itemCount = 0;
        this.pool = [];
        this._renderScheduled = false;
        this._resizeTimer = null;
        this._scrollEndTimer = null;

        this.sizerEl.style.position = "relative";

        this._onScrollBound = () => this._onScroll();
        this.viewportEl.addEventListener("scroll", this._onScrollBound, { passive: true });

        this._resizeObserver = new ResizeObserver(() => this._onResize());
        this._resizeObserver.observe(this.viewportEl);

        
    }

    /**
     * Measures row height by creating two test rows and measuring the distance
     * between their top edges (rather than just using a single row's offsetHeight).
     * This captures row-gap/margins from the CSS that would otherwise cause
     * increasing drift the further down the list is scrolled.
     */
    measureRowHeight() {
        const probeA = this.createRow();
        const probeB = this.createRow();
        probeA.el.style.position = "absolute";
        probeB.el.style.position = "absolute";
        probeA.el.style.top = "0px";
        probeB.el.style.top = "0px";
        this.sizerEl.appendChild(probeA.el);
        this.sizerEl.appendChild(probeB.el);
        probeB.el.style.top = probeA.el.offsetHeight + "px";

        const rectA = probeA.el.getBoundingClientRect();
        const rectB = probeB.el.getBoundingClientRect();
        const measured = rectB.top - rectA.top;
        //console.log("mesured height:", measured);
        this.rowHeight = measured > 0 ? measured : (probeA.el.offsetHeight || this.rowHeight);

        probeA.el.remove();
        probeB.el.remove();

        this._updateSizerHeight();
        return this.rowHeight;
    }

    /** sets the item count. Rebuilds the sizer height and initializes/grows the pool. */
    setCount(count) {
        this.itemCount = count;
        this._updateSizerHeight();
        if (this.pool.length === 0) {
            this._initPool();
        } else {
            this._resizePool();
        }
        this.render();
    }

    _updateSizerHeight() {
        if (this.sizerEl && this.rowHeight)
            this.sizerEl.style.height = (this.itemCount * this.rowHeight) + "px";
    }

    _makePoolRow() {
        const row = this.createRow();
        row.el.style.position = "absolute";
        row.el.style.left = "0";
        row.el.style.right = "0";
        row.el.style.top = "0px";
        row.el.style.display = "none";
        row.boundIndex = -1;
        this.sizerEl.appendChild(row.el);
        return row;
    }

    _initPool() {
        const visibleRows = Math.ceil(this.viewportEl.clientHeight / this.rowHeight);
        const poolSize = Math.min(this.itemCount, visibleRows + this.bufferRows * 2);

        this.pool = [];
        for (let i = 0; i < poolSize; i++) {
            this.pool.push(this._makePoolRow());
        }
    }

    /** Grow the pool if the viewport becomes larger - never shrink it, as churning the DOM is unnecessary. */
    _resizePool() {
        const visibleRows = Math.ceil(this.viewportEl.clientHeight / this.rowHeight);
        const needed = Math.min(this.itemCount, visibleRows + this.bufferRows * 2);

        while (this.pool.length < needed) {
            this.pool.push(this._makePoolRow());
        }
    }

    _onScroll() {
        if (this._renderScheduled) return;
        this._renderScheduled = true;
        requestAnimationFrame(() => {
            this._renderScheduled = false;
            this.render();
        });

        if (this.onScrollEnd) {
            clearTimeout(this._scrollSaveTimer);

            this._scrollSaveTimer = setTimeout(() => {
                this.onScrollEnd();
            }, 1000);
        }
    }

    _onResize() {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this._resizePool();
            this.render();
        }, 100);
    }

    /** Rebind the pool rows to the correct window of items based on scrollTop. */
    render() {
        if (this.itemCount === 0 || this.pool.length === 0)
            return;

        const scrollTop = this.viewportEl.scrollTop;
        const firstVisible = Math.floor(scrollTop / this.rowHeight);

        let startIndex = firstVisible - this.bufferRows;
        if (startIndex < 0) startIndex = 0;

        const maxStart = Math.max(0, this.itemCount - this.pool.length);
        if (startIndex > maxStart) startIndex = maxStart;

        for (let slot = 0; slot < this.pool.length; slot++) {
            const index = startIndex + slot;
            const row = this.pool[slot];

            if (index >= this.itemCount) {
                if (row.boundIndex !== -1) {
                    row.el.style.display = "none";
                    row.boundIndex = -1;
                    if (this.unbindRow) this.unbindRow(row);
                }
                continue;
            }

            row.el.style.display = "";
            row.el.style.top = (index * this.rowHeight) + "px";
            row.boundIndex = index;
            row.el.dataset.index = index;
            this.bindRow(row.data, index);
        }
    }

    /** Re-render the visible window without changing the scroll position (e.g. after a selection change). */
    refresh() {
        this.render();
    }

    scrollToIndex(index) {
        const target = index * this.rowHeight - (this.viewportEl.clientHeight - this.rowHeight) / 2;
        this.viewportEl.scrollTop = Math.max(0, target);
    }

    /** Clean up listeners/observers when the instance is about to be destroyed. */
    destroy() {
        this.viewportEl.removeEventListener("scroll", this._onScrollBound);
        this._resizeObserver.disconnect();
        clearTimeout(this._resizeTimer);
        clearTimeout(this._scrollEndTimer);
    }

    getScrollPosition() {
        const scrollTop = this.viewportEl.scrollTop;

        return {
            index: Math.floor(scrollTop / this.rowHeight),
            offset: scrollTop % this.rowHeight
        };
    }

    setScrollPosition(position) {
        if (!position || this.itemCount === 0)
            return;

        const maxScrollTop =
            Math.max(0, this.sizerEl.offsetHeight - this.viewportEl.clientHeight);

        const scrollTop =
            position.index * this.rowHeight + position.offset;

        this.viewportEl.scrollTop = Math.min(scrollTop, maxScrollTop);
        this.render();
    }
}