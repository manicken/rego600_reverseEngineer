
class AppWindows {

    static Singletons = {};

    static events = new EventTarget();
    static emit(type, window) {
        AppWindows.events.dispatchEvent(new CustomEvent(type, { detail: { window } }));
    }

	static #AppWindowZoffset = 2000;
	static #windows = [];

    static SetAsSingleton(win) {
        let singletonID = win.constructor.TYPE;
        console.log(singletonID);
        if (AppWindows.Singletons[singletonID] !== undefined) {
            throw new Error(`AppWindow singleton already exists: ${singletonID}`);
        }
        win.canBeDestroyed = false;
        AppWindows.Singletons[singletonID] = win;
    }

    static add(win) {
        AppWindows.#windows.push(win);
        AppWindows.emit("added", win);
    }

    static remove(win) {
		let index = AppWindows.#windows.indexOf(win);
		if (index !== -1) { AppWindows.#windows.splice(index, 1); }
		AppWindows.#updateZIndexes();
    }

	static initAppWindowManager(AppWindow_msgr_el) {
        AppWindowManager.init({
            root_el:AppWindow_msgr_el,
            events:AppWindows.events,
            onGetActiveWindow:AppWindows.getActiveWindow,
            onOpenWindow:(win) => { AppWindows.activate(win);}
        });

        // pure debug event loggers
        AppWindows.events.addEventListener('open', e => { console.trace("AWM - window opened: " + e.detail.window.title, e); });
        AppWindows.events.addEventListener('close', e => { console.trace("AWM - window closed: " + e.detail.window.title, e); });
        AppWindows.events.addEventListener('minimize', e => { console.trace("AWM - window minimized: " + e.detail.window.title, e); });
        AppWindows.events.addEventListener('activate', e => { console.trace("AWM - activated: " + e.detail.window.title, e); });
        AppWindows.events.addEventListener('destroy', e => { console.trace("AWM - destroyed: " + e.detail.window.title, e); });
    }

    static saveAppWindowsState() {
		let win_export = [];
		AppWindowManager.setTaskBarOrderIndexes();
		for (let i=0;i<AppWindows.#windows.length;i++) {
			win_export.push(AppWindows.#windows[i].getStates());
		}
		let json = JSON.stringify(win_export,null,4);
		console.log(json);
	}

	static loadAppWindowsState() {
		// load from local storage and deserialize
		let windowsJson = "{}"; 
		let windows = loadAppWindows(windowsJson)

		const zOrder = [...windows].sort((a, b) => a.zIndex - b.zIndex);
		const tabOrder = [...windows].sort((a, b) => a.tabIndex - b.tabIndex);

		for (let i = 0; i < zOrder.length; i++) {
			zOrder[i].zIndex = i;
		}

		for (let i = 0; i < tabOrder.length; i++) {
			tabOrder[i].tabIndex = i;
		}
		AppWindows.#windows = zOrder;
        AppWindowManager.setTaskBarItems(tabOrder);
	}


    static getActiveWindow() {
        // it's the last z-order window that is open that represent the current active window
        for (let i = AppWindows.#windows.length - 1; i >= 0; i--) {
            if (AppWindows.#windows[i].isOpen()) return AppWindows.#windows[i];
        }
        return null;
    }

	static #updateZIndexes() {
		for (let i=0; i<AppWindows.#windows.length; i++) {
			const zIndex = i*2 + AppWindows.#AppWindowZoffset;
			const win = AppWindows.#windows[i];
			win.el.style.zIndex = zIndex;
			win.zIndex = zIndex; // used when saving state
			if (win.hasBackdrop) {
				win.backdrop_el.style.zIndex = zIndex-1;
			}
		}
	}

	/** this is a two use function, 
	 * if the window no not exist it's added, 
	 * otherwise its only bringed to front 
	 * it returns the index that is given to the window
	 */
	/** Bring to front in the z-stack (does not modify .state). Also works for completely new windows (indexOf -> -1). */
    static #bringToFront(window) {
        const idx = AppWindows.#windows.indexOf(window);
        if (idx !== -1) AppWindows.#windows.splice(idx, 1);
        AppWindows.#windows.push(window);
        AppWindows.#updateZIndexes();
    }

    static activate(window) {
        const wasClosed = window.isClosed();
        const wasMinimized = window.isMinimized();
        window.setOpen();
		window.show();
        AppWindows.#bringToFront(window);
        //AppWindowManager.render();
 
        AppWindows.emit((wasClosed || wasMinimized) ? 'reopen' : 'open', window);
		if (wasClosed) {
			window.onOpen?.(window);
		}	
    }

    static #initWindows(items) {
        for (let i=0;i<items.length;i++) {
            AppWindows.#decodeAndInitWindow(items[i]);
        }
    }

    static #WindowTypes = {
        [GotoLabelForm.TYPE]: () =>  {
            new GotoLabelForm({
                onGotoAddress: gotoDisasmAddress,
                filters: [
                    [js51_disasm.LabelType.User, "User"],
                    [js51_disasm.LabelType.Func, "Functions"],
                    [js51_disasm.LabelType.Jump, "Jumps"]
                ]
            }).onOpen = (win) => {
                win.generateList(insn_map);
            };
        },

        [LabelReferencesForm.TYPE]: () => {
            new LabelReferencesForm({
                onGotoAddress: gotoDisasmAddress
            })
        },

        [SettingsEditor.TYPE]: () => {
            new SettingsEditor()
        },

        [AssemblyViewer.TYPE]: () => {
            new AssemblyViewer()
        },

        [AssemblyEditor.TYPE]: () => {
            new AssemblyEditor({ onBuild: asmEditOnBuild });
        },

        [Profiler.TYPE]: () => {
            new Profiler({
                cpu: window.app.cpu,
                onGotoAddress: gotoDisasmAddress
            })
        },

        [HexEditor.TYPE]: () => {
            new HexEditor()
        }
    };
    
    static #decodeAndInitWindow(win) {
        const factory = AppWindows.#WindowTypes[win.type];

        if (!factory) {
            console.warn(`Unknown window type: ${win.type}`);
            return;
        }

        factory(win);
    }

    static initSingletonAppWindows() {
        let singletonsDefaults = [
            {type:GotoLabelForm.TYPE},
            {type:LabelReferencesForm.TYPE},
            {type:SettingsEditor.TYPE},
            {type:AssemblyViewer.TYPE},
            {type:Profiler.TYPE},
            {type:HexEditor.TYPE},
        ];
        console.log(singletonsDefaults);
        AppWindows.#initWindows(singletonsDefaults);
    }

}

