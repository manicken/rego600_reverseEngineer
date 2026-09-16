class AppWindowManager {
    static root = null;
    static opts = {};

    static init(root, opts = {}) {
        AppWindowManager.root = root;
        AppWindowManager.opts = opts;
        AppWindowManager._buildDom();
        AppWindowManager._bindGlobal();
    }

    static _buildDom() {
        const root = AppWindowManager.root;
        root.innerHTML = '';
        root.className = 'tabmgr';

        AppWindowManager.elLeftBtn = document.createElement('button');
        AppWindowManager.elLeftBtn.className = 'modalmgr-scrollbtn';
        AppWindowManager.elLeftBtn.textContent = '‹';
        AppWindowManager.elLeftBtn.hidden = true;

        AppWindowManager.elStrip = document.createElement('div');
        AppWindowManager.elStrip.className = 'modalmgr-strip';

        AppWindowManager.elRightBtn = document.createElement('button');
        AppWindowManager.elRightBtn.className = 'modalmgr-scrollbtn';
        AppWindowManager.elRightBtn.textContent = '›';
        AppWindowManager.elRightBtn.hidden = true;

        AppWindowManager.elClosedWrap = document.createElement('div');
        AppWindowManager.elClosedWrap.className = 'tab-closed';
        AppWindowManager.elClosedBtn = document.createElement('button');
        AppWindowManager.elClosedBtn.className = 'tab-closed-btn';
        AppWindowManager.elClosedMenu = document.createElement('div');
        AppWindowManager.elClosedMenu.className = 'tab-closed-menu';
        AppWindowManager.elClosedWrap.append(AppWindowManager.elClosedBtn, AppWindowManager.elClosedMenu);

        AppWindowManager.elCtxMenu = document.createElement('div');
        AppWindowManager.elCtxMenu.className = 'tab-tab-ctxmenu';
        document.body.appendChild(AppWindowManager.elCtxMenu);

        root.append(AppWindowManager.elLeftBtn, AppWindowManager.elStrip, AppWindowManager.elRightBtn, AppWindowManager.elClosedWrap);

        AppWindowManager.elLeftBtn.addEventListener('click', () => AppWindowManager.elStrip.scrollBy({ left: -160, behavior: 'smooth' }));
        AppWindowManager.elRightBtn.addEventListener('click', () => AppWindowManager.elStrip.scrollBy({ left: 160, behavior: 'smooth' }));
        AppWindowManager.elStrip.addEventListener('wheel', e => {
            if (e.deltaY === 0) return;
            AppWindowManager.elStrip.scrollLeft += e.deltaY;
            e.preventDefault();
        }, { passive: false });
        AppWindowManager.elStrip.addEventListener('scroll', () => AppWindowManager._updateScrollButtons());
        new ResizeObserver(() => AppWindowManager._updateScrollButtons()).observe(AppWindowManager.elStrip);

        AppWindowManager.elClosedBtn.addEventListener('click', e => {
            e.stopPropagation();
            AppWindowManager._toggleMenu(AppWindowManager.elClosedMenu);
        });
    }

    static _bindGlobal() {
        document.addEventListener('click', () => AppWindowManager._closeAllMenus());
        document.addEventListener('scroll', () => AppWindowManager._closeAllMenus(), true);
    }

    static _toggleMenu(menu) {
        const willOpen = !menu.classList.contains('open');
        AppWindowManager._closeAllMenus();
        if (willOpen) menu.classList.add('open');
    }
    static _closeAllMenus() {
        AppWindowManager.elClosedMenu.classList.remove('open');
        AppWindowManager.elCtxMenu.classList.remove('open');
    }

    static _updateScrollButtons() {
        const s = AppWindowManager.elStrip;
        const overflow = s.scrollWidth > s.clientWidth + 1;
        AppWindowManager.elLeftBtn.hidden = !overflow || s.scrollLeft <= 0;
        AppWindowManager.elRightBtn.hidden = !overflow || s.scrollLeft + s.clientWidth >= s.scrollWidth - 1;
    }

    static _render() {
        if (!AppWindowManager.elStrip) return; // taskbar inte initierad än
        AppWindowManager.elStrip.innerHTML = '';
        for (const win of AppWindow.getOpenTabs()) {
            AppWindowManager.elStrip.appendChild(AppWindowManager._renderWindow(win));
        }
        AppWindowManager._renderClosedMenu();
        requestAnimationFrame(() => AppWindowManager._updateScrollButtons());
    }

    static _renderWindow(win) {
        const el = document.createElement('div');
        el.className = 'modalmgr-tab'
            + (win === AppWindow.getActiveWindow() ? ' active' : '')
            + (win.state === AppWindow.States.Minimized ? ' minimized' : '');

        let title = win.getTitle();
        el.title = title; // this is actually the tooltip

        const title_el = document.createElement('span');
        title_el.className = 'modalmgr-tab-title';
        title_el.textContent = title; // actual shown title


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
        el.addEventListener('click', () => AppWindow.activate(win));
        el.addEventListener('contextmenu', e => {
            e.preventDefault();
            AppWindowManager._openTabContextMenu(win, e.clientX, e.clientY);
        });
        return el;
    }

    static _openTabContextMenu(win, x, y) {
        const menu = AppWindowManager.elCtxMenu;
        menu.innerHTML = '';
        const item = (label, fn, danger = false) => {
            const it = document.createElement('div');
            it.className = 'modalmgr-menu-item' + (danger ? ' danger' : '');
            it.textContent = label;
            it.addEventListener('click', ev => { ev.stopPropagation(); fn(); AppWindowManager._closeAllMenus(); });
            menu.appendChild(it);
        };
        item('Close', () => win.close());
        item('Close others', () => AppWindow.getOpenTabs().filter(w => w !== win).forEach(w => w.close()));
        item('Close all', () => AppWindow.getOpenTabs().forEach(w => w.close()));

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
        AppWindowManager._toggleMenu(menu);
    }

    static _renderClosedMenu() {
        const closed = AppWindow.getClosedTabs();
        AppWindowManager.elClosedBtn.innerHTML = `Stängda <span class="tab-closed-badge">${closed.length}</span>`;
        AppWindowManager.elClosedMenu.innerHTML = '';

        if (closed.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'tab-menu-empty';
            empty.textContent = 'Inga stängda flikar';
            AppWindowManager.elClosedMenu.appendChild(empty);
            return;
        }

        for (const win of closed) {
            const row = document.createElement('div');
            row.className = 'tab-menu-item';

            const title = document.createElement('span');
            title.className = 'tab-menu-title';
            title.textContent = win.title;

            row.appendChild(title);

            if (win.canHardClose) {
                const actions = document.createElement('span');
                actions.className = 'tab-menu-action';
                actions.textContent = 'Ta bort';
                actions.style.cursor = 'pointer';
                actions.addEventListener('click', e => { e.stopPropagation(); win.hardClose(); });
                row.appendChild(actions);
            }

            row.addEventListener('click', () => AppWindow.activate(win));
            AppWindowManager.elClosedMenu.appendChild(row);
        }
    }
}