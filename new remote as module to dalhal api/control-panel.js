/**
 * control-panel.js — generic declarative "formdata" renderer.
 *
 * You hand it an array of control descriptors and a single dispatch
 * function. It never calls anything device-specific itself — every
 * interaction just calls `onAction(control.action, control, event)`.
 * That's the "loose connection": swap the controls array + dispatcher
 * and you get a WiFi settings panel, a REGO600 panel, whatever — the
 * ControlPanel code never changes.
 *
 * Control descriptor shape:
 *   {
 *     id: "btn-pwr",              // unique within the panel
 *     type: "button"|"image"|"sprite"|"text"|"custom",
 *     label: "on/off",            // button/text label
 *     src: "encoder/step-01.png", // image type
 *     style: { top: "151px", left: "624px", width: "66px", ... },
 *     action: { ... },            // arbitrary payload, opaque to the panel
 *     render: () => HTMLElement,  // custom type only
 *
 *     // sprite type — one image file, many frames, no per-frame uploads:
 *     src: "encoder-sprite.png",
 *     frameWidth: 124, frameHeight: 124,
 *     columns: 12,                // frames per row in the sheet
 *     frame: 0,                   // initial frame index (0-based)
 *   }
 *
 * Usage:
 *   const panel = new ControlPanel({
 *     controls: REGO600_CONTROLS,
 *     background: "interface-bg.png",
 *     onAction: (action, control, evt) => dispatch(action, control),
 *   });
 *   modal.setBody(panel.el);
 */
class ControlPanel {
	constructor({ controls = [], background, width, height, className = "", onAction } = {}) {
		this.controls = controls;
		this.onAction = onAction;
		this.nodes = {};

		this.el = document.createElement("div");
		this.el.className = `control-panel ${className}`.trim();
		if (background) this.el.style.backgroundImage = `url('${background}')`;
    if (width) this.el.style.width = `${width}px`;
		if (height) this.el.style.height = `${height}px`;

		for (const control of controls) this._renderControl(control);
	}

	_renderControl(control) {
		let node;
		switch (control.type) {
			case "button":
				node = this._buildButton(control);
				break;
			case "image":
				node = this._buildImage(control);
				break;
			case "sprite":
				node = this._buildSprite(control);
				break;
			case "text":
				node = this._buildText(control);
				break;
			case "custom":
				node = control.render(control);
				break;
			default:
				console.warn(`ControlPanel: unknown control type "${control.type}" for id "${control.id}"`);
				return;
		}

		node.classList.add("control");
		if (control.style) Object.assign(node.style, control.style);
		node.dataset.controlId = control.id;

		this.nodes[control.id] = node;
		this.el.appendChild(node);
	}

	_buildButton(control) {
		const btn = document.createElement("div");
		btn.className = "control-btn";
		btn.textContent = control.label ?? "";
		btn.addEventListener("click", (evt) => this.onAction?.(control.action, control, evt));
		return btn;
	}

	_buildImage(control) {
		const img = document.createElement("img");
		img.className = "control-image";
		img.src = control.src;
		img.alt = control.label ?? control.id;
		if (control.action) {
			img.addEventListener("click", (evt) => this.onAction?.(control.action, control, evt));
		}
		return img;
	}

	_buildSprite(control) {
		const div = document.createElement("div");
		div.className = "control-sprite";
		div.style.backgroundImage = `url('${control.src}')`;
 
		// Display size can differ from the sheet's native frame size (e.g. a
		// 72x74 sheet rendered at 124x124) — an explicit style.width/height
		// wins, otherwise it's 1:1 with the source frame.
		const displayWidth = control.style?.width ? parseFloat(control.style.width) : control.frameWidth;
		const displayHeight = control.style?.height ? parseFloat(control.style.height) : control.frameHeight;
		div.style.width = `${displayWidth}px`;
		div.style.height = `${displayHeight}px`;
 
		this.spriteConfig ??= {};
		const config = { ...control, displayWidth, displayHeight };
		this.spriteConfig[control.id] = config;
		this._setSpriteFrame(div, config, control.frame ?? 0);
 
		if (control.action) {
			div.addEventListener("click", (evt) => this.onAction?.(control.action, control, evt));
		}
		return div;
	}
 
	_setSpriteFrame(node, control, frameIndex) {
		const col = frameIndex % control.columns;
		const row = Math.floor(frameIndex / control.columns);
		const rows = control.rows ?? 1;
 
		// Scale the whole sheet so each frame lands exactly on the display box —
		// avoids bleeding into neighboring frames when display size != frame size.
		node.style.backgroundSize = `${control.columns * control.displayWidth}px ${rows * control.displayHeight}px`;
		node.style.backgroundPosition = `-${col * control.displayWidth}px -${row * control.displayHeight}px`;
	}

	_buildText(control) {
		const div = document.createElement("div");
		div.className = "control-text";
		div.textContent = control.label ?? "";
		return div;
	}

	/** Get the live DOM node for a control id (e.g. to init a 3rd-party widget on it). */
	getNode(id) {
		return this.nodes[id];
	}

	/** Convenience updaters for the built-in types. */
	updateImage(id, src) {
		const node = this.nodes[id];
		if (node) node.src = src;
	}

	updateSprite(id, frameIndex) {
		const node = this.nodes[id];
		const config = this.spriteConfig?.[id];
		if (node && config) this._setSpriteFrame(node, config, frameIndex);
	}

	updateText(id, text) {
		const node = this.nodes[id];
		if (node) node.textContent = text;
	}
}