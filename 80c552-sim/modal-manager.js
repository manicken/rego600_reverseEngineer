class ModalManager {
    static root = null;
    static opts = {};

    static init(root, opts = {}) {
        ModalManager.root = root;
        ModalManager.opts = opts;
        ModalManager._buildDom();
        ModalManager._bindGlobal();
    }

    static _buildDom() {
        const root = ModalManager.root;
        root.innerHTML = '';
        root.className = 'tabmgr';

        ModalManager.elLeftBtn = document.createElement('button');
        ModalManager.elLeftBtn.className = 'modalmgr-scrollbtn';
        ModalManager.elLeftBtn.textContent = '‹';
        ModalManager.elLeftBtn.hidden = true;

        ModalManager.elStrip = document.createElement('div');
        ModalManager.elStrip.className = 'modalmgr-strip';

        ModalManager.elRightBtn = document.createElement('button');
        ModalManager.elRightBtn.className = 'modalmgr-scrollbtn';
        ModalManager.elRightBtn.textContent = '›';
        ModalManager.elRightBtn.hidden = true;

        ModalManager.elClosedWrap = document.createElement('div');
        ModalManager.elClosedWrap.className = 'modalmgr-closed';
        ModalManager.elClosedBtn = document.createElement('button');
        ModalManager.elClosedBtn.className = 'modalmgr-closed-btn';
        ModalManager.elClosedMenu = document.createElement('div');
        ModalManager.elClosedMenu.className = 'modalmgr-closed-menu';
        ModalManager.elClosedWrap.append(ModalManager.elClosedBtn, ModalManager.elClosedMenu);

        ModalManager.elCtxMenu = document.createElement('div');
        ModalManager.elCtxMenu.className = 'modalmgr-tab-ctxmenu';
        document.body.appendChild(ModalManager.elCtxMenu);

        root.append(ModalManager.elLeftBtn, ModalManager.elStrip, ModalManager.elRightBtn, ModalManager.elClosedWrap);

        ModalManager.elLeftBtn.addEventListener('click', () => ModalManager.elStrip.scrollBy({ left: -160, behavior: 'smooth' }));
        ModalManager.elRightBtn.addEventListener('click', () => ModalManager.elStrip.scrollBy({ left: 160, behavior: 'smooth' }));
        ModalManager.elStrip.addEventListener('wheel', e => {
            if (e.deltaY === 0) return;
            ModalManager.elStrip.scrollLeft += e.deltaY;
            e.preventDefault();
        }, { passive: false });
        ModalManager.elStrip.addEventListener('scroll', () => ModalManager._updateScrollButtons());
        new ResizeObserver(() => ModalManager._updateScrollButtons()).observe(ModalManager.elStrip);

        ModalManager.elClosedBtn.addEventListener('click', e => {
            e.stopPropagation();
            ModalManager._toggleMenu(ModalManager.elClosedMenu);
        });
    }

    static _bindGlobal() {
        document.addEventListener('click', () => ModalManager._closeAllMenus());
        document.addEventListener('scroll', () => ModalManager._closeAllMenus(), true);
    }

    static _toggleMenu(menu) {
        const willOpen = !menu.classList.contains('open');
        ModalManager._closeAllMenus();
        if (willOpen) menu.classList.add('open');
    }
    static _closeAllMenus() {
        ModalManager.elClosedMenu.classList.remove('open');
        ModalManager.elCtxMenu.classList.remove('open');
    }

    static _updateScrollButtons() {
        const s = ModalManager.elStrip;
        const overflow = s.scrollWidth > s.clientWidth + 1;
        ModalManager.elLeftBtn.hidden = !overflow || s.scrollLeft <= 0;
        ModalManager.elRightBtn.hidden = !overflow || s.scrollLeft + s.clientWidth >= s.scrollWidth - 1;
    }

    static _render() {
        if (!ModalManager.elStrip) return; // taskbar inte initierad än
        ModalManager.elStrip.innerHTML = '';
        for (const win of Modal.getOpenTabs()) {
            ModalManager.elStrip.appendChild(ModalManager._renderWindow(win));
        }
        ModalManager._renderClosedMenu();
        requestAnimationFrame(() => ModalManager._updateScrollButtons());
    }

    static _renderWindow(win) {
        const el = document.createElement('div');
        el.className = 'modalmgr-tab'
            + (win === Modal.getActiveWindow() ? ' active' : '')
            + (win.state === Modal.States.Minimized ? ' minimized' : '');
        //el.dataset.id = win.id;
        el.title = win.title;

        const title = document.createElement('span');
        title.className = 'modalmgr-tab-title';
        title.textContent = win.title;

        const actions = document.createElement('span');

        actions.className = 'modalmgr-tab-actions';

        const dot = document.createElement('span');
        dot.className = 'tab-dot';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modalmgr-tab-close';
        closeBtn.textContent = '✖';
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', e => { e.stopPropagation(); win.close(); });

        actions.append(dot, closeBtn);

        el.append(title, actions);
        el.addEventListener('click', () => Modal.activate(win));
        el.addEventListener('contextmenu', e => {
            e.preventDefault();
            ModalManager._openTabContextMenu(win, e.clientX, e.clientY);
        });
        return el;
    }

    static _openTabContextMenu(win, x, y) {
        const menu = ModalManager.elCtxMenu;
        menu.innerHTML = '';
        const item = (label, fn, danger = false) => {
            const it = document.createElement('div');
            it.className = 'modalmgr-menu-item' + (danger ? ' danger' : '');
            it.textContent = label;
            it.addEventListener('click', ev => { ev.stopPropagation(); fn(); ModalManager._closeAllMenus(); });
            menu.appendChild(it);
        };
        item('Close', () => win.close());
        item('Close others', () => Modal.getOpenTabs().filter(w => w !== win).forEach(w => w.close()));
        item('Close all', () => Modal.getOpenTabs().forEach(w => w.close()));

        if (win.canHardClose) {
            const sep = document.createElement('div'); sep.className = 'modalmgr-menu-sep';
            menu.appendChild(sep);
            item('Remove permanently', () => {
                confirmModal({
                    title: "Confirm close",
                    message: `Are you sure you want to permanently close this window: ${win.title}<br><br>Warning this cannot be undone!`,
                    confirmText: "Close Permanent",
                    confirmClass: "button-danger",
                    onConfirm: () => win.hardClose()
                });
            }, true);
        }

        menu.style.top = y + 'px';
        menu.style.left = x + 'px';
        ModalManager._toggleMenu(menu);
    }

    static _renderClosedMenu() {
        const closed = Modal.getClosedTabs();
        ModalManager.elClosedBtn.innerHTML = `Stängda <span class="modalmgr-closed-badge">${closed.length}</span>`;
        ModalManager.elClosedMenu.innerHTML = '';

        if (closed.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'modalmgr-menu-empty';
            empty.textContent = 'Inga stängda flikar';
            ModalManager.elClosedMenu.appendChild(empty);
            return;
        }

        for (const win of closed) {
            const row = document.createElement('div');
            row.className = 'modalmgr-menu-item';

            const title = document.createElement('span');
            title.className = 'modalmgr-menu-title';
            title.textContent = win.title;

            row.appendChild(title);

            if (win.canHardClose) {
                const actions = document.createElement('span');
                actions.className = 'modalmgr-menu-action';
                actions.textContent = 'Ta bort';
                actions.style.cursor = 'pointer';
                actions.addEventListener('click', e => { e.stopPropagation(); win.hardClose(); });
                row.appendChild(actions);
            }

            row.addEventListener('click', () => Modal.activate(win));
            ModalManager.elClosedMenu.appendChild(row);
        }
    }
}