/**
 * TabManager
 * -----------
 * Dependency-free tab strip for managing "open files" (or any keyed items).
 *
 * Design:
 *  - close (X) is a SOFT close: the tab disappears from the strip but its
 *    data/content is kept and listed under the "Closed" dropdown.
 *  - permanent deletion only happens via a menu action ("Ta bort permanent"),
 *    reachable from the tab's right-click context menu or the Closed dropdown.
 *  - drag-and-drop reordering of open tabs.
 *  - auto horizontal scrolling with edge buttons that appear on overflow.
 *
 * Everything is driven by plain data + an EventTarget, so wiring up your own
 * UI (content panes, menus, persistence, etc.) is just listening for events -
 * see the bottom of this file for a usage example.
 *
 * Events dispatched on the TabManager instance (all CustomEvent, detail={id, tab}):
 *   'open'  'activate'  'close'  'reopen'  'remove'  'reorder'
 */
class TabManager extends EventTarget {
  /**
   * @param {HTMLElement} root - empty container to render into
   * @param {Object} [opts]
   * @param {(tab:Object)=>string} [opts.getIcon] - optional icon/prefix per tab
   */
  constructor(root, opts = {}) {
    super();
    this.root = root;
    this.opts = opts;

    /** @type {Map<string,Object>} all known tabs, open or closed, keyed by id */
    this.tabs = new Map();
    /** @type {string[]} order of OPEN tabs (closed tabs are not in here) */
    this.order = [];
    this.activeId = null;

    this._dragId = null;
    this._buildDom();
    this._bindGlobal();
  }

  // ---------- public API ----------

  /** Open (or focus, if already open) a tab. data is your own payload. */
  open(id, { title = id, data = null, activate = true, dirty = false } = {}) {
    let tab = this.tabs.get(id);
    if (tab) {
      tab.closed = false;
      if (!this.order.includes(id)) this.order.push(id);
    } else {
      tab = { id, title, data, dirty, closed: false };
      this.tabs.set(id, tab);
      this.order.push(id);
    }
    this._render();
    this._emit('open', tab);
    if (activate) this.activate(id);
    return tab;
  }

  activate(id) {
    if (!this.tabs.has(id) || this.tabs.get(id).closed) return;
    this.activeId = id;
    this._render();
    this._emit('activate', this.tabs.get(id));
    this._scrollIntoView(id);
  }

  /** Soft close: hide from strip, keep data for later reopen. */
  close(id) {
    const tab = this.tabs.get(id);
    if (!tab || tab.closed) return;
    const idx = this.order.indexOf(id);
    tab.closed = true;
    this.order = this.order.filter(x => x !== id);

    if (this.activeId === id) {
      const next = this.order[idx] ?? this.order[idx - 1] ?? null;
      this.activeId = next;
      if (next) this._emit('activate', this.tabs.get(next));
    }
    this._render();
    this._emit('close', tab);
  }

  /** Reopen a previously soft-closed tab, restoring its position at the end. */
  reopen(id) {
    const tab = this.tabs.get(id);
    if (!tab || !tab.closed) return;
    tab.closed = false;
    this.order.push(id);
    this._render();
    this._emit('reopen', tab);
    this.activate(id);
  }

  /** Permanently delete a tab and its data, open or closed. */
  remove(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    
    confirmModal({
        title: "Confirm delete",
        message: `Are you sure you want to delete: ${tab.title}<br><br>Warning this cannot be undone!`,
        confirmText: "Delete Permanent",
        confirmClass: "button-danger",
        onConfirm: () => {
            this.order = this.order.filter(x => x !== id);
            this.tabs.delete(id);
            if (this.activeId === id) {
                this.activeId = this.order[0] ?? null;
                if (this.activeId) { 
                    this._emit('activate', this.tabs.get(this.activeId));
                }
            }
            this._render();
            this._emit('remove', tab);
        }
    });
    
  }

  closeOthers(id) {
    [...this.order].filter(x => x !== id).forEach(x => this.close(x));
  }

  closeAll() {
    [...this.order].forEach(x => this.close(x));
  }

  setDirty(id, dirty = true) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.dirty = dirty;
    this._render();
  }

  reorder(id, beforeId /* null = move to end */) {
    if (id === beforeId) return;
    this.order = this.order.filter(x => x !== id);
    if (beforeId == null) this.order.push(id);
    else {
      const i = this.order.indexOf(beforeId);
      this.order.splice(i < 0 ? this.order.length : i, 0, id);
    }
    this._render();
    this._emit('reorder', this.tabs.get(id));
  }

  get openTabs() { return this.order.map(id => this.tabs.get(id)); }
  get closedTabs() { return [...this.tabs.values()].filter(t => t.closed); }

  // ---------- internals ----------

  _emit(type, tab) {
    this.dispatchEvent(new CustomEvent(type, { detail: { id: tab.id, tab } }));
  }

  _buildDom() {
    this.root.innerHTML = '';
    this.root.className = 'tabmgr';

    this.elLeftBtn = document.createElement('button');
    this.elLeftBtn.className = 'tabmgr-scrollbtn';
    this.elLeftBtn.textContent = '‹';
    this.elLeftBtn.hidden = true;

    this.elStrip = document.createElement('div');
    this.elStrip.className = 'tabmgr-strip';

    this.elRightBtn = document.createElement('button');
    this.elRightBtn.className = 'tabmgr-scrollbtn';
    this.elRightBtn.textContent = '›';
    this.elRightBtn.hidden = true;

    this.elClosedWrap = document.createElement('div');
    this.elClosedWrap.className = 'tabmgr-closed';
    this.elClosedBtn = document.createElement('button');
    this.elClosedBtn.className = 'tabmgr-closed-btn';
    this.elClosedMenu = document.createElement('div');
    this.elClosedMenu.className = 'tabmgr-closed-menu';
    this.elClosedWrap.append(this.elClosedBtn, this.elClosedMenu);

    this.elCtxMenu = document.createElement('div');
    this.elCtxMenu.className = 'tab-ctxmenu';
    document.body.appendChild(this.elCtxMenu); // fixed-position, own layer

    this.root.append(this.elLeftBtn, this.elStrip, this.elRightBtn, this.elClosedWrap);

    this.elLeftBtn.addEventListener('click', () => this.elStrip.scrollBy({ left: -160, behavior: 'smooth' }));
    this.elRightBtn.addEventListener('click', () => this.elStrip.scrollBy({ left: 160, behavior: 'smooth' }));
    this.elStrip.addEventListener('wheel', e => {
      if (e.deltaY === 0) return;
      this.elStrip.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
    this.elStrip.addEventListener('scroll', () => this._updateScrollButtons());
    new ResizeObserver(() => this._updateScrollButtons()).observe(this.elStrip);

    this.elClosedBtn.addEventListener('click', e => {
      e.stopPropagation();
      this._toggleMenu(this.elClosedMenu);
    });
  }

  _bindGlobal() {
    document.addEventListener('click', () => this._closeAllMenus());
    document.addEventListener('scroll', () => this._closeAllMenus(), true);
  }

  _toggleMenu(menu) {
    const willOpen = !menu.classList.contains('open');
    this._closeAllMenus();
    if (willOpen) menu.classList.add('open');
  }
  _closeAllMenus() {
    this.elClosedMenu.classList.remove('open');
    this.elCtxMenu.classList.remove('open');
  }

  _updateScrollButtons() {
    const s = this.elStrip;
    const overflow = s.scrollWidth > s.clientWidth + 1;
    this.elLeftBtn.hidden = !overflow || s.scrollLeft <= 0;
    this.elRightBtn.hidden = !overflow || s.scrollLeft + s.clientWidth >= s.scrollWidth - 1;
  }

  _scrollIntoView(id) {
    const el = this.elStrip.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (el) el.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
  }

  _render() {
    this.elStrip.innerHTML = '';
    for (const id of this.order) {
      this.elStrip.appendChild(this._renderTab(this.tabs.get(id)));
    }
    this._renderClosedMenu();
    requestAnimationFrame(() => this._updateScrollButtons());
  }

  _renderTab(tab) {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === this.activeId ? ' active' : '') + (tab.dirty ? ' dirty' : '');
    el.dataset.id = tab.id;
    el.draggable = true;
    el.title = tab.title;

    const icon = this.opts.getIcon ? this.opts.getIcon(tab) : null;
    if (icon) {
      const iconEl = document.createElement('span');
      iconEl.textContent = icon;
      el.appendChild(iconEl);
    }

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title;

    const dot = document.createElement('span');
    dot.className = 'tab-dot';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Stäng (behåller data)';
    closeBtn.addEventListener('click', e => { e.stopPropagation(); this.close(tab.id); });

    el.append(title, dot, closeBtn);

    el.addEventListener('click', () => this.activate(tab.id));
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      this._openTabContextMenu(tab, e.clientX, e.clientY);
    });

    // drag reorder
    el.addEventListener('dragstart', e => {
      this._dragId = tab.id;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tab.id);
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      this.elStrip.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over-before', 'drag-over-after'));
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      if (!this._dragId || this._dragId === tab.id) return;
      const before = e.clientX < el.getBoundingClientRect().left + el.offsetWidth / 2;
      el.classList.toggle('drag-over-before', before);
      el.classList.toggle('drag-over-after', !before);
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over-before', 'drag-over-after'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over-before', 'drag-over-after');
      if (!this._dragId || this._dragId === tab.id) return;
      const before = e.clientX < el.getBoundingClientRect().left + el.offsetWidth / 2;
      this.reorder(this._dragId, before ? tab.id : (this.order[this.order.indexOf(tab.id) + 1] ?? null));
      this._dragId = null;
    });

    return el;
  }

  _openTabContextMenu(tab, x, y) {
    const menu = this.elCtxMenu;
    menu.innerHTML = '';
    const item = (label, fn, danger = false) => {
      const it = document.createElement('div');
      it.className = 'tabmgr-menu-item' + (danger ? ' danger' : '');
      it.textContent = label;
      it.addEventListener('click', ev => { ev.stopPropagation(); fn(); this._closeAllMenus(); });
      menu.appendChild(it);
    };
    item('Stäng', () => this.close(tab.id));
    item('Stäng övriga', () => this.closeOthers(tab.id));
    item('Stäng alla', () => this.closeAll());
    const sep = document.createElement('div'); sep.className = 'tabmgr-menu-sep';
    menu.appendChild(sep);
    item('Ta bort permanent', () => this.remove(tab.id), true);

    menu.style.left = 'auto';
    menu.style.right = 'auto';
    menu.style.top = y + 'px';
    menu.style.left = x + 'px';
    this._toggleMenu(menu);
  }

  _renderClosedMenu() {
    const closed = this.closedTabs;
    this.elClosedBtn.innerHTML = `Stängda <span class="tabmgr-closed-badge">${closed.length}</span>`;
    this.elClosedMenu.innerHTML = '';

    if (closed.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tabmgr-menu-empty';
      empty.textContent = 'Inga stängda flikar';
      this.elClosedMenu.appendChild(empty);
      return;
    }

    for (const tab of closed) {
      const row = document.createElement('div');
      row.className = 'tabmgr-menu-item';

      const title = document.createElement('span');
      title.className = 'tabmgr-menu-title';
      title.textContent = tab.title;
      title.addEventListener('click', () => this.reopen(tab.id));

      const actions = document.createElement('span');
      actions.className = 'tabmgr-menu-action';
      actions.textContent = 'Ta bort';
      actions.style.cursor = 'pointer';
      actions.addEventListener('click', e => { e.stopPropagation(); this.remove(tab.id); });

      row.append(title, actions);
      row.addEventListener('click', () => this.reopen(tab.id));
      this.elClosedMenu.appendChild(row);
    }
  }
}