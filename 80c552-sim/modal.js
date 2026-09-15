/**
 * modal.js — generic movable modal window.
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
 *   const modal = new Modal({ title: "REGO600 Control Panel" });
 *   modal.setBody(someElement);
 *   modal.setFooter(someButtonRow);  // optional
 *   modal.mount();   // attaches to document.body
 *   modal.open();
 */


class Modal {
	static #WinID = 0;
	static States = Object.freeze({ Open: 0, Minimized: 1, Closed: 3 });
	static events = new EventTarget(); // central lifecycle-bus, ersätter mm:s EventTarget

	static #ModalZoffset = 2000;
	static #windows = [];
	// helper structures to make reorder much easier
	static #windowsZOrder = [];
	static #taskbarOrder = [];

	static initModalManager(modal_msgr_el) {
        ModalManager.init(modal_msgr_el);
        window.app.mm = ModalManager; // referens till den statiska klassen, ej instans

        Modal.events.addEventListener('close', e => log("file closed: " + e.detail.window.title));
        Modal.events.addEventListener('activate', e => log("tm - activated: " + e.detail.window.title));
        Modal.events.addEventListener('lastclosed', e => log("last closed: " + e.detail.window.title));
        Modal.events.addEventListener('hardclose', e => {
            log("deleted: " + e.detail.window.title);
            e.detail.window.data?.removePermanent?.();
            delete e.detail.window.data;
        });
    }

	getState() {
		return {x:this.x, y:this.y, state:this.state, zIndex:this.zIndex, tabIndex:this.tabIndex};
	}

	static saveWindowsState() {
		let win_export = {};
		for (let i=0;i<Modal.#windows.length;i++) {
			win_export.push(Modal.#windows[i].getState());
		}
		// serialize to json and save to local storage
	}

	static loadWindows(windows) {

	}

	static loadWindowsState() {
		// load from local storage and deserialize 
		Modal.#windows = loadWindows(windows)

		const zOrder = [...windows].sort((a, b) => a.zIndex - b.zIndex);
		const tabOrder = [...windows].sort((a, b) => a.tabIndex - b.tabIndex);

		for (let i = 0; i < zOrder.length; i++) {
			zOrder[i].zIndex = i;
		}

		for (let i = 0; i < tabOrder.length; i++) {
			tabOrder[i].tabIndex = i;
		}
		Modal.#windowsZOrder = zOrder;
		Modal.#taskbarOrder = tabOrder;
	}

    static #emit(type, window) {
        Modal.events.dispatchEvent(new CustomEvent(type, { detail: { window } }));
    }

    static getWindowList()  { return Modal.#windows; }
    static getOpenTabs()    { return Modal.#windows.filter(w => w.state !== Modal.States.Closed); }
    static getClosedTabs()  { return Modal.#windows.filter(w => w.state === Modal.States.Closed); }

    static getActiveWindow() {
        for (let i = Modal.#windows.length - 1; i >= 0; i--) {
            if (Modal.#windows[i].state === Modal.States.Open) return Modal.#windows[i];
        }
        return null;
    }

	static #updateZIndexes() {
		for (let i=0; i<Modal.#windows.length; i++) {
			Modal.#windows[i].el.style.zIndex = i + Modal.#ModalZoffset;
		}
		return Modal.#windows.length-1 + Modal.#ModalZoffset;
	}
	
	static #remove(window) {
		const index = Modal.#windows.indexOf(window);
		if (index === -1) return;
		Modal.#windows.splice(index, 1);
		Modal.#updateZIndexes();
		ModalManager._render();
	}

	/** this is a two use function, 
	 * if the window no not exist it's added, 
	 * otherwise its only bringed to front 
	 * it returns the index that is given to the window
	 */
	/** flytta fram i z-stacken (rör inte .state). Fungerar även för helt nya fönster (indexOf -> -1). */
    static #bringToFront(window) {
        const idx = Modal.#windows.indexOf(window);
        if (idx !== -1) Modal.#windows.splice(idx, 1);
        Modal.#windows.push(window);
        Modal.#updateZIndexes();
    }

    /** Universell "användaren valde denna flik"-ingång: open/minimized/closed -> Open + fram i stacken */
    static activate(window) {
        const wasClosed = window.state === Modal.States.Closed;
        window.state = Modal.States.Open;
		window._open();
        //window.mount();
        Modal.#bringToFront(window);
        ModalManager._render();
        Modal.#emit(wasClosed ? 'reopen' : 'activate', window);
    }

	constructor({
		title = "",
		type = "unknown",
		width,
		height,
		x,
		y,
		closable = true,
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
		this.state = Modal.States.Minimized;
		this.title = title,
		this.type = type,
		this.onClose = onClose;
		this.onOpen = onOpen;
		this.hasBackdrop = backdrop;
		this.onResize = onResize;
		this.onResized = onResized;
		this.canHardClose = canHardClose;

		this.el = document.createElement("div");
		this.el.className = "modal";
		if (width) this.el.style.width = `${width}px`;
		if (height) this.el.style.height = `${height}px`;

		this.headerEl = document.createElement("div");
		this.headerEl.className = "modal-header";

		this.titleEl = document.createElement("div");
		this.titleEl.className = "modal-title";
		this.titleEl.textContent = title;
		this.headerEl.appendChild(this.titleEl);

		if (backdrop) {
			this.el.setAttribute("role", "dialog");
			this.el.setAttribute("aria-modal", "true");
			this.el.setAttribute("aria-labelledby", this.titleEl.id);
		}

		if (closable) {
			this.closeBtn = document.createElement("button");
			this.closeBtn.className = "modal-close";
			this.closeBtn.type = "button";
			this.closeBtn.setAttribute("aria-label", "Close");
			this.closeBtn.textContent = "\u00d7";
			this.closeBtn.addEventListener("click", () => this.close());
			this.headerEl.appendChild(this.closeBtn);
		}

		this.bodyEl = document.createElement("div");
		this.bodyEl.className = "modal-body";

		this.footerEl = document.createElement("div");
		this.footerEl.className = "modal-footer";
		this.footerEl.style.display = "none"; // hidden until setFooter() is used

		this.el.appendChild(this.headerEl);
		this.el.appendChild(this.bodyEl);
		this.el.appendChild(this.footerEl);

		this.el.addEventListener("pointerdown", (e) => {
			//e.stopPropagation();
			Modal.activate(this);
		});

		//*****************************/
		// the most important task
		//*****************************/
		

		if (backdrop) {
			this.backdropEl = document.createElement("div");
			this.backdropEl.className = "modal-backdrop";
			
			
			this.backdropEl.appendChild(this.el);
			if (closeOnBackdropClick) {
				this.backdropEl.addEventListener("click", (e) => {
					if (e.target === this.backdropEl) this.close();
				});
			}
		} 

		if (closeOnEscape) {
			this._onEscape = (e) => {
				if (e.key === "Escape" && this.isOpen()) this.close();
			};
		}

		if (draggable) { 
			this._makeDraggable(this.headerEl);
		}
		if (resizable) {
			this._makeResizable();
		}
		this._setInitialPosition(x, y);

		if (automount) {
			this.mount();
		}

		//Modal.activate(this);
	}

	_setInitialPosition(x, y) {
		// Default: roughly centered, offset slightly so multiple modals cascade.
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
			if (e.target.closest(".modal-close")) return;
			//Modal.#activate(this);
			dragging = true;
			const rect = this.el.getBoundingClientRect();
			startX = e.clientX;
			startY = e.clientY;
			startLeft = rect.left;
			startTop = rect.top;
			this.el.classList.add("modal--dragging");
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
			this.el.classList.remove("modal--dragging");
			try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
		};

		handle.addEventListener("pointerdown", onPointerDown);
		handle.addEventListener("pointermove", onPointerMove);
		handle.addEventListener("pointerup", onPointerUp);
		handle.addEventListener("pointercancel", onPointerUp);
	}

	_addResizeHandle(className, resizeFn) {
		const handle = document.createElement("div");
		handle.className = `modal-resize-handle ${className}`;
		this.el.appendChild(handle);

		let resizing = false;
		
		let startWidth, startHeight;
		let startPointerX , startPointerY;
		let startLeft, startTop;

		const onPointerDown = (e) => {
			resizing = true;
			Modal.activate(this);

			const rect = this.el.getBoundingClientRect();

			startPointerX = e.clientX;
			startPointerY = e.clientY;

			startLeft = rect.left;
			startTop = rect.top;

			startWidth = rect.width;
			startHeight = rect.height;

			this.el.classList.add("modal--resizing");

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

			this.el.classList.remove("modal--resizing");

			try {
				handle.releasePointerCapture(e.pointerId);

				if (this.onResized) {
					const rect = this.bodyEl.getBoundingClientRect();
					this.onResized(this, rect.width, rect.height);
				}
			} catch (ex) {
				console.log("modal resize error:", ex);
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

	/** Replace the modal body with the given node. */
	setBody(node) {
		this.bodyEl.innerHTML = "";
		this.bodyEl.appendChild(node);
		return this;
	}

	/** Replace the modal footer with the given node (e.g. a Cancel/Send button row). */
	setFooter(node) {
		this.footerEl.innerHTML = "";
		this.footerEl.appendChild(node);
		this.footerEl.style.display = "";
		return this;
	}

	setTitle(title) {
		this.titleEl.textContent = title;
		return this;
	}

	mount(parent = document.body) {
		parent.appendChild(this.hasBackdrop ? this.backdropEl : this.el);
		return this;
	}

	isOpen() {
		return this.el.classList.contains("modal--open");
	}

	_open() {
		this.el.classList.add("modal--open");
		if (this.hasBackdrop) this.backdropEl.classList.add("modal-backdrop--open");
		if (this._onEscape) document.addEventListener("keydown", this._onEscape);
		this.onOpen?.(this);
	}

	open() {
		Modal.activate(this);
		return this;
	}

	close() {
		this.el.classList.remove("modal--open");
		if (this.hasBackdrop) this.backdropEl.classList.remove("modal-backdrop--open");
		if (this._onEscape) document.removeEventListener("keydown", this._onEscape);
		this.onClose?.(this);
		return this;
	}

	toggle() {
		this.isOpen() ? this.close() : this.open();
		return this;
	}

	destroy() {
		if (this._onEscape) document.removeEventListener("keydown", this._onEscape);
		(this.hasBackdrop ? this.backdropEl : this.el).remove();
		Modal.#remove(this);
	}
}

function AceEditorModal({ title = "Ace Editor", type="GeneralAceEditor", height=600, width=500, aceTheme="textmate", aceMode="text"}) {
	let modal_el = new Modal({title, type, height, width, resizable: true});
	modal_el.bodyEl.innerHTML = "";
	setStyles(modal_el.bodyEl, { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding:'6px', boxSizing: 'border-box' });
	let header_el = appendNewElement(modal_el.bodyEl, 'div', { styles: { width: '100%', /*height: '32px',*/ display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding:'4px' }})
	let ace_editor_el = appendNewElement(modal_el.bodyEl, 'div', { styles: { width: '100%', height: '100%', boxSizing: 'border-box' } });

	let ace_editor = ace.edit(ace_editor_el);
	ace_editor.setOptions({
		enableVirtualSpace: true,
		scrollPastEnd: 1
	});
	ace_editor.setTheme("ace/theme/" + aceTheme);
	ace_editor.session.setMode("ace/mode/" + aceMode);
	
	return {modal_el, header_el, ace_editor_el, ace_editor, open() {this.modal_el._open()}};
}

function inputModal({ title = "Input", message = "Enter Value: ", confirmText = "OK", value = "", enterConfirm=true, confirmClass = "", onValidate = (value) => { return true; }, onConfirm = (value) => {} } = {})
{
    const modal = new Modal({ title, height: 200, width: 350, backdrop: true, closeOnBackdropClick: false, z:2000 });
	let body_el = createNewElement('div', {styles:{width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding:'8px'}})
	let message_el = createNewElement("div", { innerHTML: message, styles: { padding: "8px" } });
	let input_el = createNewElement('input', { type:"text" });
	let error_el = createNewElement('div', {styles:{display:'none', color:'#b40000'}});
	function validateAndConfirm() {
		let validationRes = onValidate(input_el.value); 
		if (validationRes !== true) {
			error_el.textContent = validationRes;
			error_el.style.display = '';
			//infoModal({message:validationRes, z:3000});
			input_el.focus();
			return;
		}
		error_el.style.display = 'none';
		onConfirm(input_el.value);
		modal.destroy();
	}
	if (enterConfirm == true) {
		input_el.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				validateAndConfirm();
			}
		});
	}
	input_el.value = value;
	body_el.appendChild(message_el);
	body_el.appendChild(input_el);
	body_el.appendChild(error_el);

    modal.setBody(body_el);
    modal.setFooter(createButtonBar([
        {
            text: confirmText,
            className: confirmClass,
            onClick: () => {
				validateAndConfirm();
            }
        },
        {
            text: "Cancel",
            onClick: () => {
                modal.destroy();
            }
        }
    ]));
    modal.open();
	input_el.focus();
    return modal;
}

function confirmModal({ title = "Confirm", message = "", confirmText = "OK", confirmClass = "", onConfirm = () => {} } = {})
{
    const modal = new Modal({ title, height: 200, width: 350, backdrop: true, closeOnBackdropClick: false, z:2000 });
    modal.setBody(createNewElement("div", { innerHTML: message, styles: { padding: "8px" } }));
    modal.setFooter(createButtonBar([
        {
            text: confirmText,
            className: confirmClass,
            onClick: () => {
                modal.destroy();
                onConfirm();
            }
        },
        {
            text: "Cancel",
            onClick: () => {
                modal.destroy();
            }
        }
    ]));
    modal.open();
    return modal;
}

function infoModal({ title = "Info", message = "", buttonText = "OK", z=3000, onConfirm = () => {} } = {})
{
    const modal = new Modal({ title, height: 200, width: 350, backdrop: true, closeOnBackdropClick: false, z });
    modal.setBody(createNewElement("div", { innerHTML: message, styles: { padding: "8px" } }));
    modal.setFooter(createButtonBar([
        {
            text: buttonText,
            onClick: () => {
                modal.destroy();
                onConfirm();
            }
        }
    ]));
    modal.open();
    return modal;
}

function notImplementedMessageDialog() {
	console.trace("This function is not yes implemented");
	infoModal({message:"This function is not yes implemented"});
}
