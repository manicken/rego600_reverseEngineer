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

	static get TYPE() {
        return this.name;
    }
	
	static Modes = Object.freeze({
		Open: 0,
		Minimized: 1,
		Closed: 3
	});
	static ModeToString = Object.fromEntries(
		Object.keys(AppWindow.Modes).map(key => [AppWindow.Modes[key], key])
	);
	static StringToMode = Object.fromEntries(
		Object.entries(AppWindow.Modes).map(([key, value]) => [key, value])
	);
	getModeAsString() {
		return AppWindow.ModeToString[this.mode] ?? AppWindow.Modes.Closed;
	}
	setModeFromString(mode) {
		if (typeof mode == "string") {
			this.mode = AppWindow.StringToMode[mode];
		} else {
			this.mode = mode;
		}
		if (this.mode == undefined) {
			this.setClosed();
		}
	}
	isOpen() {
		return this.mode == AppWindow.Modes.Open;
	}
	isClosed() {
		return this.mode == AppWindow.Modes.Closed;
	}
	isMinimized() {
		return this.mode == AppWindow.Modes.Minimized;
	}
	setOpen() {
		this.mode = AppWindow.Modes.Open;
	}
	setClosed() {
		this.mode = AppWindow.Modes.Closed;
	}
	setMinimized() {
		this.mode = AppWindow.Modes.Minimized;
	}

	getStates() {
		return {
			x: this.el.style.left, 
			y: this.el.style.top, 
			width: this.el.style.width, 
			height: this.el.style.height,
			mode: this.getModeAsString(),
			zIndex: this.el.style.zIndex, 
			tabIndex: this.tabIndex??0
		};
	}

	setStates(states) {
		this.el.style.left = states.x ?? this.el.style.left;
		this.el.style.top = states.y ?? this.el.style.top;
		this.el.style.width = states.width ?? this.el.style.width;
		this.el.style.height = states.height ?? this.el.style.height;
		this.setModeFromString(states.mode);
		this.zIndex = states.zIndex ?? 2000;
		this.tabIndex = states.tabIndex ?? 0;
	}

    

	constructor({
		title = "",
		/** when singleton is true canBeDestroyed is automatically set to false */
		singleton = false,
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
		canBeDestroyed = true,
		onClose,
		onOpen,
		onResize,
		onResized
	} = {}) {
		super();
		this.setClosed();
		this.title = title,
		this.onClose = onClose;
		this.onOpen = onOpen;
		this.hasBackdrop = backdrop;
		this.onResize = onResize;
		this.onResized = onResized;
		this.canBeDestroyed = canBeDestroyed;

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
		AppWindows.add(this);
		if (singleton === true) {
			AppWindows.SetAsSingleton(this);
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

	

	open() {
		AppWindows.open(this);
		this.setOpen();
		AppWindows.activate(this); // this exec show
		this.onOpen?.(this);
		return this;
	}

	show() {
		this.el.classList.add("AppWindow--open");
		if (this.hasBackdrop) this.backdrop_el.classList.add("AppWindow-backdrop--open");
		if (this._onEscape) document.addEventListener("keydown", this._onEscape);
		AppWindows.emit('show', this);
	}

	hide() {
        this.el.classList.remove("AppWindow--open");
		if (this.hasBackdrop) this.backdrop_el.classList.remove("AppWindow-backdrop--open");
		AppWindows.emit('hide', this);
    }

	minimize() {
        if (this.isMinimized()) {
			console.warn("window was allready Minimized:" + this.constructor.TYPE);
			//return;
		}
		this.setMinimized();
		this.hide();
        //AppWindowManager.render();
        AppWindows.emit('minimize', this);
    }

	/** close */
	close() {
		if (this.isClosed()) {
			console.warn("window was allready closed:" + this.constructor.TYPE);
			//return;
		}
		this.setClosed();
		this.hide();
		
		this.el.classList.remove("AppWindow--open");
		if (this.hasBackdrop) this.backdrop_el.classList.remove("AppWindow-backdrop--open");
		if (this._onEscape) document.removeEventListener("keydown", this._onEscape);
		this.onClose?.(this);
		AppWindows.emit('close', this);
		//AppWindowManager.render();
		return this;
	}

	destroy() {
		if (!this.canBeDestroyed) return false;
		this.hide();
		if (this._onEscape) document.removeEventListener("keydown", this._onEscape);
		(this.hasBackdrop ? this.backdrop_el : this.el).remove();
        AppWindows.remove(this);
        AppWindows.emit('destroy', this);
        return true;
		
	}
}
