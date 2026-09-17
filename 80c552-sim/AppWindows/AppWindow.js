/**
 * AppWindow.js — generic movable AppWindow window.
 *
 * Completely decoupled from what goes inside it. Give it a title and,
 * optionally, a body node — it just provides window chrome. Reuse it for
 * anything: the REGO600 panel, a WiFi settings form, a log viewer, etc.
 *
 * Two chrome styles, both from the same class:
 *   - Free-floating tool window (default): draggable, no backdrop, can
 *     stay open alongside other UI. Used by the REGO600 panel.
 *   - Blocking dialog: `backdrop: true` adds a dimmed overlay, click-outside
 *     and Escape both close it, and dialog ARIA attributes are set
 *     automatically. Typically paired with `draggable: false`. Used by
 *     the WiFi setup form.
 *
 * Usage:
 *   const AppWindow = new AppWindow({ title: "REGO600 Control Panel" });
 *   AppWindow.setBody(someElement);
 *   AppWindow.setFooter(someButtonRow);  // optional
 *   AppWindow.mount();   // attaches to document.body
 *   AppWindow.open();
 */

class AppWindow extends EventTarget{

	static Singletons = {};
	static States = Object.freeze({
		Open: 0,
		Minimized: 1,
		Closed: 3
	});

	static StateToString = Object.fromEntries(
		Object.keys(AppWindow.States)
			.map(key => [AppWindow.States[key], key])
	);

	static StringToState = Object.fromEntries(
		Object.entries(AppWindow.States)
			.map(([key, value]) => [key, value])
	);
	static events = new EventTarget(); // central lifecycle-bus, ersätter mm:s EventTarget

	static #AppWindowZoffset = 2000;
	static #windows = [];
	// helper structures to make reorder much easier
	// actually i have come to the conclusion that zOrder can be directly implemented using only #windows
	// as there is no point of having it separate
	//static #windowsZOrder = [];
	static #taskbarOrder = [];

	static initAppWindowManager(AppWindow_msgr_el) {
        AppWindowManager.init(AppWindow_msgr_el);

        AppWindow.events.addEventListener('close', e => log("window closed: " + e.detail.window.title));
        AppWindow.events.addEventListener('activate', e => log("tm - activated: " + e.detail.window.title));
        AppWindow.events.addEventListener('lastclosed', e => log("last closed: " + e.detail.window.title));
        AppWindow.events.addEventListener('hardclose', e => {
            log("deleted: " + e.detail.window.title);
            e.detail.window.data?.removePermanent?.();
            delete e.detail.window.data;
        });
    }

	getState() {
		return {x:this.el.offsetLeft, y:this.el.offsetTop, state:AppWindow.StateToString[this.state], zIndex:this.el.style.zIndex, tabIndex:this.tabIndex??0};
	}

	static saveAppWindowsState() {
		let win_export = [];
		for (let i=0;i<AppWindow.#taskbarOrder.length;i++) {
			AppWindow.#taskbarOrder[i].tabIndex = i;
		}
		for (let i=0;i<AppWindow.#windows.length;i++) {
			win_export.push(AppWindow.#windows[i].getState());
		}
		let json = JSON.stringify(win_export);
		console.log(json);
	}

	static loadAppWindows(windows) {

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
		AppWindow.#windows = zOrder;
		AppWindow.#taskbarOrder = tabOrder;
	}

    static #emit(type, window) {
        AppWindow.events.dispatchEvent(new CustomEvent(type, { detail: { window } }));
    }

    //static getAppWindowList()  { return AppWindow.#windows; }
    static getOpenTabs()    { return AppWindow.#taskbarOrder.filter(w => w.state !== AppWindow.States.Closed); }
    static getClosedTabs()  { return AppWindow.#taskbarOrder.filter(w => w.state === AppWindow.States.Closed); }

    static getActiveWindow() {
        for (let i = AppWindow.#windows.length - 1; i >= 0; i--) {
            if (AppWindow.#windows[i].state === AppWindow.States.Open) return AppWindow.#windows[i];
        }
        return null;
    }

	static #updateZIndexes() {
		for (let i=0; i<AppWindow.#windows.length; i++) {
			const zIndex = i*2 + AppWindow.#AppWindowZoffset;
			const win = AppWindow.#windows[i];
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
	/** flytta fram i z-stacken (rör inte .state). Fungerar även för helt nya fönster (indexOf -> -1). */
    static #bringToFront(window) {
        const idx = AppWindow.#windows.indexOf(window);
        if (idx !== -1) AppWindow.#windows.splice(idx, 1);
        AppWindow.#windows.push(window);
        AppWindow.#updateZIndexes();
    }

    /** Universell "användaren valde denna flik"-ingång: open/minimized/closed -> Open + fram i stacken */
    static activate(window) {
        const wasClosed = window.state === AppWindow.States.Closed;
        window.state = AppWindow.States.Open;
		window.show();
        //window.mount();
        AppWindow.#bringToFront(window);
        AppWindowManager._render();
        AppWindow.#emit(wasClosed ? 'reopen' : 'activate', window);
		window.onOpen?.(window);
    }

	constructor({
		title = "",
		type = "unknown",
		/** when singletonID is set canHardClose is automatically set to false */
		singletonID = null,
		width,
		height,
		x,
		y,
		closable = true,
		minimizable = true,
		draggable = true,
		backdrop = false,
		resizable = false,
		automount = true,
		closeOnBackdropClick = true,
		closeOnEscape = backdrop,
		canHardClose = true,
		onClose,
		onOpen,
		onResize,
		onResized
	} = {}) {
		super();
		this.state = AppWindow.States.Closed;
		this.title = title,
		this.type = type,
		this.onClose = onClose;
		this.onOpen = onOpen;
		this.hasBackdrop = backdrop;
		this.onResize = onResize;
		this.onResized = onResized;
		this.canHardClose = canHardClose;

		this.el = document.createElement("div");
		this.el.className = "AppWindow";
		if (width) this.el.style.width = `${width}px`;
		if (height) this.el.style.height = `${height}px`;

		this.header_el = document.createElement("div");
		this.header_el.className = "AppWindow-header";

		this.title_el = document.createElement("div");
		this.title_el.className = "AppWindow-title";
		this.title_el.textContent = title;
		this.header_el.appendChild(this.title_el);

		if (backdrop) {
			this.el.setAttribute("role", "dialog");
			this.el.setAttribute("aria-modal", "true");
			this.el.setAttribute("aria-labelledby", this.title_el.id);
		}
		let windowControls_el = document.createElement("div");
		windowControls_el.className = "AppWindow-controls";
		this.header_el.appendChild(windowControls_el);
		if (minimizable) {
			this.minimizeBtn_el = document.createElement("button");
			this.minimizeBtn_el.className = "AppWindow-control AppWindow-minimize";
			this.minimizeBtn_el.type = "button";
			this.minimizeBtn_el.setAttribute("aria-label", "Minimize");
			this.minimizeBtn_el.textContent = "_";
			this.minimizeBtn_el.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
			this.minimizeBtn_el.addEventListener("click", () => this.minimize());
			windowControls_el.appendChild(this.minimizeBtn_el);
		}

		if (closable) {
			this.closeBtn_el = document.createElement("button");
			this.closeBtn_el.className = "AppWindow-control AppWindow-close";
			this.closeBtn_el.type = "button";
			this.closeBtn_el.setAttribute("aria-label", "Close");
			this.closeBtn_el.textContent = "\u00d7";
			this.closeBtn_el.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
			this.closeBtn_el.addEventListener("click", () => this.close());
			windowControls_el.appendChild(this.closeBtn_el);
		}

		

		this.body_el = document.createElement("div");
		this.body_el.className = "AppWindow-body";

		this.footer_el = document.createElement("div");
		this.footer_el.className = "AppWindow-footer";
		this.footer_el.style.display = "none"; // hidden until setFooter() is used

		this.el.appendChild(this.header_el);
		this.el.appendChild(this.body_el);
		this.el.appendChild(this.footer_el);

		this.el.addEventListener("pointerdown", (e) => {
			//e.stopPropagation();
			AppWindow.activate(this);
		});

		//*****************************/
		// the most important task
		//*****************************/
		

		if (backdrop) {
			this.backdrop_el = document.createElement("div");
			this.backdrop_el.className = "AppWindow-backdrop";
			
			
			this.backdrop_el.appendChild(this.el);
			if (closeOnBackdropClick) {
				this.backdrop_el.addEventListener("click", (e) => {
					if (e.target === this.backdrop_el) this.close();
				});
			}
		} 

		if (closeOnEscape) {
			this._onEscape = (e) => {
				if (e.key === "Escape" && this.isOpen()) this.close();
			};
		}

		if (draggable) { 
			this._makeDraggable(this.header_el);
		}
		if (resizable) {
			this._makeResizable();
		}
		this._setInitialPosition(x, y);

		if (automount) {
			this.mount();
		}

		if (singletonID !== null) {
			if (AppWindow.Singletons[singletonID] !== undefined) {
				throw new Error(`AppWindow singleton already exists: ${singletonID}`);
			}
			AppWindow.#windows.push(this);
			AppWindow.#taskbarOrder.push(this);
			AppWindowManager._render();
			this.canHardClose = false;
			AppWindow.Singletons[singletonID] = this;
		}

	}

	_setInitialPosition(x, y) {
		// Default: roughly centered, offset slightly so multiple AppWindows cascade.
		const left = x ?? Math.max(20, (window.innerWidth - (parseInt(this.el.style.width) || 400)) / 2);
		const top = y ?? Math.max(20, window.innerHeight * 0.1);
		this.el.style.left = `${left}px`;
		this.el.style.top = `${top}px`;
	}

	_makeDraggable(handle) {
		let dragging = false;
		let startX, startY, startLeft, startTop;

		const onPointerDown = (e) => {
			// Ignore drags started on the close button.
			if (e.target.closest(".AppWindow-close")) return;
			//AppWindow.#activate(this);
			dragging = true;
			const rect = this.el.getBoundingClientRect();
			startX = e.clientX;
			startY = e.clientY;
			startLeft = rect.left;
			startTop = rect.top;
			this.el.classList.add("AppWindow--dragging");
			handle.setPointerCapture(e.pointerId);
		};

		const onPointerMove = (e) => {
			if (!dragging) return;
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			const maxLeft = window.innerWidth - this.el.offsetWidth;
			const maxTop = window.innerHeight - this.el.offsetHeight;
			const left = Math.min(Math.max(0, startLeft + dx), Math.max(0, maxLeft));
			const top = Math.min(Math.max(0, startTop + dy), Math.max(0, maxTop));
			this.el.style.left = `${left}px`;
			this.el.style.top = `${top}px`;
		};

		const onPointerUp = (e) => {
			dragging = false;
			this.el.classList.remove("AppWindow--dragging");
			try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
		};

		handle.addEventListener("pointerdown", onPointerDown);
		handle.addEventListener("pointermove", onPointerMove);
		handle.addEventListener("pointerup", onPointerUp);
		handle.addEventListener("pointercancel", onPointerUp);
	}

	_addResizeHandle(className, resizeFn) {
		const handle = document.createElement("div");
		handle.className = `AppWindow-resize-handle ${className}`;
		this.el.appendChild(handle);

		let resizing = false;
		
		let startWidth, startHeight;
		let startPointerX , startPointerY;
		let startLeft, startTop;

		const onPointerDown = (e) => {
			resizing = true;
			AppWindow.activate(this);

			const rect = this.el.getBoundingClientRect();

			startPointerX = e.clientX;
			startPointerY = e.clientY;

			startLeft = rect.left;
			startTop = rect.top;

			startWidth = rect.width;
			startHeight = rect.height;

			this.el.classList.add("AppWindow--resizing");

			handle.setPointerCapture(e.pointerId);

			e.preventDefault();
			e.stopPropagation();
		};

		const onPointerMove = (e) => {
			if (!resizing) return;

			const dx = e.clientX - startPointerX;
			const dy = e.clientY - startPointerY;

			const minWidth = 250;
			const minHeight = 150;

			const size = resizeFn(
				startLeft,
				startTop,
				startWidth,
				startHeight,
				dx,
				dy,
				minWidth,
				minHeight
			);

			this.el.style.left = `${size.x}px`;
			this.el.style.top = `${size.y}px`;
			this.el.style.width = `${size.width}px`;
			this.el.style.height = `${size.height}px`;

			if (this.onResize) {
				this.onResize(this, size.width, size.height);
			}
		};

		const onPointerUp = (e) => {
			resizing = false;

			this.el.classList.remove("AppWindow--resizing");

			try {
				handle.releasePointerCapture(e.pointerId);

				if (this.onResized) {
					const rect = this.body_el.getBoundingClientRect();
					this.onResized(this, rect.width, rect.height);
				}
			} catch (ex) {
				console.log("AppWindow resize error:", ex);
			}
		};

		handle.addEventListener("pointerdown", onPointerDown);
		handle.addEventListener("pointermove", onPointerMove);
		handle.addEventListener("pointerup", onPointerUp);
		handle.addEventListener("pointercancel", onPointerUp);

		return handle;
	}

	_makeResizable() {

		this._addResizeHandle("top-left", (x, y, w, h, dx, dy, minW, minH) => 
			{
				const width = Math.max(minW, w - dx);
				const height = Math.max(minH, h - dy);

				return {
					x: x + (w - width),
					y: y + (h - height),
					width,
					height
				};
			}
		);

		this._addResizeHandle("top-right", (x, y, w, h, dx, dy, minW, minH) => {
			const width = Math.max(minW, w + dx);
			const height = Math.max(minH, h - dy);

			return {
				x,
				y: y + (h - height),
				width,
				height
			};
		});

		this._addResizeHandle("bottom-left", (x, y, w, h, dx, dy, minW, minH) => ({
			x:      x + dx,
			y:      y,
			width:  Math.max(minW, w - dx),
			height: Math.max(minH, h + dy)
		}));

		this._addResizeHandle("bottom-right", (x, y, w, h, dx, dy, minW, minH) => ({
			x:      x,
			y:      y,
			width:  Math.max(minW, w + dx),
			height:  Math.max(minH, h + dy)
		}));
	}

	/** Replace the AppWindow body with the given node. */
	setBody(node) {
		this.body_el.innerHTML = "";
		this.body_el.appendChild(node);
		return this;
	}

	/** Replace the AppWindow footer with the given node (e.g. a Cancel/Send button row). */
	setFooter(node) {
		this.footer_el.innerHTML = "";
		this.footer_el.appendChild(node);
		this.footer_el.style.display = "";
		return this;
	}

	setTitle(title) {
		this.title_el.textContent = title;
		return this;
	}
	
	getTitle() {
		return this.title_el.textContent;
	}

	mount(parent = document.body) {
		parent.appendChild(this.hasBackdrop ? this.backdrop_el : this.el);
		return this;
	}

	isOpen() {
		return this.el.classList.contains("AppWindow--open");
	}

	open() {
		const idx = AppWindow.#taskbarOrder.indexOf(this);
        if (idx !== -1) AppWindow.#taskbarOrder.splice(idx, 1);
		AppWindow.#taskbarOrder.push(this);
		this.state = AppWindow.States.Open;
		AppWindow.activate(this); // this exec show
		this.onOpen?.(this);
		return this;
	}

	show() {
		this.el.classList.add("AppWindow--open");
		if (this.hasBackdrop) this.backdrop_el.classList.add("AppWindow-backdrop--open");
		if (this._onEscape) document.addEventListener("keydown", this._onEscape);
		AppWindow.#emit('show', this);
	}

	hide() {
        this.el.classList.remove("AppWindow--open");
		if (this.hasBackdrop) this.backdrop_el.classList.remove("AppWindow-backdrop--open");
		AppWindow.#emit('hide', this);
    }

	minimize() {
        if (this.state === AppWindow.States.Closed) return;
        this.state = AppWindow.States.Minimized;
		this.hide();
        AppWindowManager._render();
        AppWindow.#emit('minimize', this);
    }

	/** SOFT close */
	close() {
		if (this.state === AppWindow.States.Closed) return;
       // const wasActive = AppWindow.getActiveWindow() === this;
        this.state = AppWindow.States.Closed;
		this.hide();
		
		this.el.classList.remove("AppWindow--open");
		if (this.hasBackdrop) this.backdrop_el.classList.remove("AppWindow-backdrop--open");
		if (this._onEscape) document.removeEventListener("keydown", this._onEscape);
		this.onClose?.(this);
		AppWindow.#emit('close', this);
		AppWindowManager._render();
		return this;
	}

	/** HARD close – permanent, respekterar canHardClose */
    hardClose() {
        if (!this.canHardClose) return false;
		this.hide();
        this.destroy();
        AppWindow.#emit('hardclose', this);
        return true;
    }

	/*toggle() {
		this.isOpen() ? this.close() : this.open();
		return this;
	}*/

	destroy() {
		if (this._onEscape) document.removeEventListener("keydown", this._onEscape);
		(this.hasBackdrop ? this.backdrop_el : this.el).remove();
		let index = AppWindow.#windows.indexOf(this);
		if (index !== -1) { AppWindow.#windows.splice(index, 1); }
		index = AppWindow.#taskbarOrder.indexOf(this);
		if (index !== -1) { AppWindow.#taskbarOrder.splice(index, 1); }
		AppWindow.#updateZIndexes();
		AppWindowManager._render();
	}
}
