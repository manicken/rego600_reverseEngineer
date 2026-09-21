class AppWindowManager {
    static #onGetActiveWindow = null;
    static #onOpenWindow = null;
    static #taskbarOrder = [];
    static #taskbarOrderRemove(win) {
        const idx = AppWindowManager.#taskbarOrder.indexOf(win);
        if (idx !== -1) AppWindowManager.#taskbarOrder.splice(idx, 1);
    }
    static #taskbarOrderMoveLast(win) {
        AppWindowManager.#taskbarOrderRemove(win);
        AppWindowManager.#taskbarOrder.push(win);
    }

    static #getOpenTabs()    { return AppWindowManager.#taskbarOrder.filter(w => w.isClosed() == false); }
    static #getClosedTabs()  { return AppWindowManager.#taskbarOrder.filter(w => w.isClosed()); }

    static init({root_el=null, events=null, onGetActiveWindow=null, onOpenWindow=null}={}) {
        if (root_el == null) throw new Error("root_el is required");
        if (events == null) throw new Error("events is required");
        if (onGetActiveWindow == null) throw new Error("onGetActiveWindow is required");
        if (onOpenWindow == null) throw new Error("onOpenWindow is required");

        
        AppWindowManager.#onGetActiveWindow = onGetActiveWindow;
        AppWindowManager.#onOpenWindow = onOpenWindow;

        AppWindowManager.#buildDom(root_el);
        AppWindowManager.#bindGlobal();
        events.addEventListener('added', (e) => {
            const win = e.detail.window;
            AppWindowManager.#taskbarOrderMoveLast(win);
            AppWindowManager.#requestRender();
        });
        events.addEventListener('close', () => { AppWindowManager.#requestRender(); });
        events.addEventListener('open', (e) => {
            AppWindowManager.#taskbarOrderMoveLast(e.detail.window);
            AppWindowManager.#requestRender();
        });
        events.addEventListener('reopen', (e) => {
            AppWindowManager.#requestRender();
        });
        events.addEventListener('minimize', () => { AppWindowManager.#requestRender(); });
        events.addEventListener('destroy', (e) => {
            AppWindowManager.#taskbarOrderRemove(e.detail.window);
            AppWindowManager.#requestRender();
        });
    }
    /** used only when saving state */
    setTaskBarOrderIndexes() {
        for (let i=0;i<AppWindowManager.#taskbarOrder.length;i++) {
			AppWindowManager.#taskbarOrder[i].tabIndex = i;
		}
    }
    setTaskBarItems(items) {
        AppWindowManager.#taskbarOrder = items;
        AppWindowManager.#requestRender();
    }

    static #renderPending = false;

    static #requestRender() {
        if (AppWindowManager.#renderPending) {
            return;
        }

        AppWindowManager.#renderPending = true;

        requestAnimationFrame(() => {
            AppWindowManager.#renderPending = false;
            AppWindowManager.#render();
        });
    }

    static #buildDom(root_el) {
        const root = root_el;
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
        AppWindowManager.elStrip.addEventListener('scroll', () => AppWindowManager.#updateScrollButtons());
        new ResizeObserver(() => AppWindowManager.#updateScrollButtons()).observe(AppWindowManager.elStrip);

        AppWindowManager.elClosedBtn.addEventListener('click', e => {
            e.stopPropagation();
            AppWindowManager.#toggleMenu(AppWindowManager.elClosedMenu);
        });
    }

    static #bindGlobal() {
        document.addEventListener('click', () => AppWindowManager.#closeAllMenus());
        document.addEventListener('scroll', () => AppWindowManager.#closeAllMenus(), true);
    }

    static #toggleMenu(menu) {
        const willOpen = !menu.classList.contains('open');
        AppWindowManager.#closeAllMenus();
        if (willOpen) menu.classList.add('open');
    }
    static #closeAllMenus() {
        AppWindowManager.elClosedMenu.classList.remove('open');
        AppWindowManager.elCtxMenu.classList.remove('open');
    }

    static #updateScrollButtons() {
        const s = AppWindowManager.elStrip;
        const overflow = s.scrollWidth > s.clientWidth + 1;
        AppWindowManager.elLeftBtn.hidden = !overflow || s.scrollLeft <= 0;
        AppWindowManager.elRightBtn.hidden = !overflow || s.scrollLeft + s.clientWidth >= s.scrollWidth - 1;
    }

    static #render() {
        if (!AppWindowManager.elStrip) return; // taskbar inte initierad än
        AppWindowManager.elStrip.innerHTML = '';
        for (const win of AppWindowManager.#getOpenTabs()) {
            AppWindowManager.elStrip.appendChild(AppWindowManager.#renderWindow(win));
        }
        AppWindowManager.#renderClosedMenu();
        requestAnimationFrame(() => AppWindowManager.#updateScrollButtons());
    }

    static #renderWindow(win) {
        const el = document.createElement('div');
        el.className = 'app-window-manager-tab'
            + (win === AppWindowManager.#onGetActiveWindow() ? ' active' : '')

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
        el.addEventListener('click', () => AppWindowManager.#onOpenWindow(win));
        el.addEventListener('contextmenu', e => {
            e.preventDefault();
            AppWindowManager.#openTabContextMenu(win, e.clientX, e.clientY);
        });
        return el;
    }

    static #openTabContextMenu(win, x, y) {
        const menu = AppWindowManager.elCtxMenu;
        menu.innerHTML = '';
        const item = (label, fn, danger = false) => {
            const it = document.createElement('div');
            it.className = 'app-window-manager-menu-item' + (danger ? ' danger' : '');
            it.textContent = label;
            it.addEventListener('click', ev => { ev.stopPropagation(); fn(); AppWindowManager.#closeAllMenus(); });
            menu.appendChild(it);
        };
        item('Close', () => win.close());
        item('Close others', () => AppWindowManager.#getOpenTabs().filter(w => w !== win).forEach(w => w.close()));
        item('Close all', () => AppWindowManager.#getOpenTabs().forEach(w => w.close()));

        if (win.canBeDestroyed) {
            const sep = document.createElement('div'); sep.className = 'app-window-manager-menu-sep';
            menu.appendChild(sep);
            item('Close Permanent', () => {
                ConfirmDialog.Show({
                    title: "Confirm close",
                    message: `Are you sure you want to permanently close this window: ${win.title}<br><br>Warning this cannot be undone!`,
                    confirmText: "Close Permanent",
                    confirmClass: "button-danger",
                    onConfirm: () => {console.log(win.destroy());}
                });
            }, true);
        }
        
        AppWindowManager.#toggleMenu(menu);
        
        if (menu.classList.contains('open')) {
            menu.style.left = `${x}px`;
            menu.style.top = `${y - menu.offsetHeight}px`;
        }
    }

    static #renderClosedMenu() {
        const closed = AppWindowManager.#getClosedTabs();
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

            if (win.canBeDestroyed) {
                const actions = document.createElement('span');
                actions.className = 'app-window-manager-menu-action';
                actions.textContent = 'Remove';
                actions.style.cursor = 'pointer';
                actions.addEventListener('click', e => { e.stopPropagation(); win.destroy(); });
                row.appendChild(actions);
            }

            row.addEventListener('click', () => AppWindowManager.#onOpenWindow(win));
            AppWindowManager.elClosedMenu.appendChild(row);
        }
    }
}