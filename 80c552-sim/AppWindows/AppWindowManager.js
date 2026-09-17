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
        root.className = 'app-window-manager';

        AppWindowManager.elLeftBtn = document.createElement('button');
        AppWindowManager.elLeftBtn.className = 'app-window-manager-scrollbtn';
        AppWindowManager.elLeftBtn.textContent = '‹';
        AppWindowManager.elLeftBtn.hidden = true;

        AppWindowManager.elStrip = document.createElement('div');
        AppWindowManager.elStrip.className = 'app-window-manager-strip';

        AppWindowManager.elRightBtn = document.createElement('button');
        AppWindowManager.elRightBtn.className = 'app-window-manager-scrollbtn';
        AppWindowManager.elRightBtn.textContent = '›';
        AppWindowManager.elRightBtn.hidden = true;

        AppWindowManager.elClosedWrap = document.createElement('div');
        AppWindowManager.elClosedWrap.className = 'app-window-manager-closed';
        AppWindowManager.elClosedBtn = document.createElement('button');
        AppWindowManager.elClosedBtn.className = 'app-window-manager-closed-btn';
        AppWindowManager.elClosedMenu = document.createElement('div');
        AppWindowManager.elClosedMenu.className = 'app-window-manager-closed-menu';
        AppWindowManager.elClosedWrap.append(AppWindowManager.elClosedBtn, AppWindowManager.elClosedMenu);

        AppWindowManager.elCtxMenu = document.createElement('div');
        AppWindowManager.elCtxMenu.className = 'app-window-manager-tab-ctxmenu';
        document.body.appendChild(AppWindowManager.elCtxMenu);

        root.append(AppWindowManager.elClosedWrap, AppWindowManager.elLeftBtn, AppWindowManager.elStrip, AppWindowManager.elRightBtn);

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
        el.className = 'app-window-manager-tab'
            + (win === AppWindow.getActiveWindow() ? ' active' : '')
            + (win.state === AppWindow.States.Minimized ? ' minimized' : '');

        let title = win.getTitle();
        el.title = title; // this is actually the tooltip

        const title_el = document.createElement('span');
        title_el.className = 'app-window-manager-tab-title';
        title_el.textContent = title; // actual shown title


        const actions = document.createElement('span');

        actions.className = 'app-window-manager-tab-actions';

        const dot = document.createElement('span');
        dot.className = 'tab-dot';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'app-window-manager-tab-close';
        closeBtn.textContent = '✖';
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', e => { e.stopPropagation(); win.close(); });

        actions.append(dot, closeBtn);

        el.append(title_el, actions);
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
            it.className = 'app-window-manager-menu-item' + (danger ? ' danger' : '');
            it.textContent = label;
            it.addEventListener('click', ev => { ev.stopPropagation(); fn(); AppWindowManager._closeAllMenus(); });
            menu.appendChild(it);
        };
        item('Close', () => win.close());
        item('Close others', () => AppWindow.getOpenTabs().filter(w => w !== win).forEach(w => w.close()));
        item('Close all', () => AppWindow.getOpenTabs().forEach(w => w.close()));

        if (win.canHardClose) {
            const sep = document.createElement('div'); sep.className = 'app-window-manager-menu-sep';
            menu.appendChild(sep);
            item('Close Permanent', () => {
                ConfirmDialog.Show({
                    title: "Confirm close",
                    message: `Are you sure you want to permanently close this window: ${win.title}<br><br>Warning this cannot be undone!`,
                    confirmText: "Close Permanent",
                    confirmClass: "button-danger",
                    onConfirm: () => {console.log(win.hardClose());}
                });
            }, true);
        }
        
        AppWindowManager._toggleMenu(menu);
        
        if (menu.classList.contains('open')) {
            menu.style.left = `${x}px`;
            menu.style.top = `${y - menu.offsetHeight}px`;
        }
        
    }

    static _renderClosedMenu() {
        const closed = AppWindow.getClosedTabs();
        AppWindowManager.elClosedBtn.innerHTML = `Closed <span class="app-window-manager-closed-badge">${closed.length}</span>`;
        AppWindowManager.elClosedMenu.innerHTML = '';

        if (closed.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'app-window-manager-menu-empty';
            empty.textContent = 'No closed windows';
            AppWindowManager.elClosedMenu.appendChild(empty);
            return;
        }

        for (const win of closed) {
            const row = document.createElement('div');
            row.className = 'app-window-manager-menu-item';

            const title = document.createElement('span');
            title.className = 'app-window-manager-menu-title';
            title.textContent = win.title;

            row.appendChild(title);

            if (win.canHardClose) {
                const actions = document.createElement('span');
                actions.className = 'app-window-manager-menu-action';
                actions.textContent = 'Remove';
                actions.style.cursor = 'pointer';
                actions.addEventListener('click', e => { e.stopPropagation(); win.hardClose(); });
                row.appendChild(actions);
            }

            row.addEventListener('click', () => AppWindow.activate(win));
            AppWindowManager.elClosedMenu.appendChild(row);
        }
    }
}