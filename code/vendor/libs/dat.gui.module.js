const styles = `
.dat-gui {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.75rem 0.75rem 0.5rem;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  font-family: "Inter", system-ui, sans-serif;
  color: #e2e8f0;
  min-width: 180px;
  z-index: 10;
}
.dat-gui h3 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.dat-gui .row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.dat-gui .row label {
  flex: 1;
  font-size: 0.8rem;
}
.dat-gui .row input[type="range"] {
  flex: 1;
}
`;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("dat-gui-inline-styles")) return;
  const style = document.createElement("style");
  style.id = "dat-gui-inline-styles";
  style.textContent = styles;
  document.head.appendChild(style);
}

class Controller {
  constructor(gui, object, property, min, max, step) {
    this.gui = gui;
    this.object = object;
    this.property = property;
    this.min = typeof min === "number" ? min : undefined;
    this.max = typeof max === "number" ? max : undefined;
    this.step = typeof step === "number" ? step : undefined;
    this._listeners = [];
    this._buildRow();
  }

  _buildRow() {
    const row = document.createElement("div");
    row.className = "row";

    this.label = document.createElement("label");
    this.label.textContent = this.property;
    row.appendChild(this.label);

    const currentValue = this.object[this.property];
    if (typeof currentValue === "boolean") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(currentValue);
      input.addEventListener("change", () => {
        this.object[this.property] = input.checked;
        this._notify(input.checked);
      });
      row.appendChild(input);
      this.input = input;
    } else if (typeof currentValue === "number") {
      const input = document.createElement("input");
      input.type = "range";
      input.value = currentValue;
      if (this.min !== undefined) input.min = this.min;
      if (this.max !== undefined) input.max = this.max;
      if (this.step !== undefined) input.step = this.step;
      input.addEventListener("input", () => {
        const value = parseFloat(input.value);
        this.object[this.property] = value;
        this._notify(value);
      });
      row.appendChild(input);
      this.input = input;
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.value = currentValue ?? "";
      input.addEventListener("change", () => {
        this.object[this.property] = input.value;
        this._notify(input.value);
      });
      row.appendChild(input);
      this.input = input;
    }

    this.gui._body.appendChild(row);
    this.row = row;
  }

  _notify(value) {
    for (const listener of this._listeners) {
      listener(value);
    }
  }

  onChange(callback) {
    if (typeof callback === "function") {
      this._listeners.push(callback);
    }
    return this;
  }

  name(text) {
    this.label.textContent = text;
    return this;
  }

  listen() {
    return this;
  }

  setValue(value) {
    this.object[this.property] = value;
    if (this.input) {
      if (this.input.type === "checkbox") {
        this.input.checked = Boolean(value);
      } else {
        this.input.value = value;
      }
    }
    return this;
  }

  updateDisplay() {
    if (!this.input) return this;
    const value = this.object[this.property];
    if (this.input.type === "checkbox") {
      this.input.checked = Boolean(value);
    } else {
      this.input.value = value;
    }
    return this;
  }

  destroy() {
    if (this.row?.parentNode) {
      this.row.parentNode.removeChild(this.row);
    }
  }
}

export default class GUI {
  constructor({ autoPlace = true, title = "Controls" } = {}) {
    ensureStyles();
    this.domElement = document.createElement("div");
    this.domElement.className = "dat-gui";

    this._title = document.createElement("h3");
    this._title.textContent = title;
    this.domElement.appendChild(this._title);

    this._body = document.createElement("div");
    this.domElement.appendChild(this._body);

    if (autoPlace && typeof document !== "undefined") {
      document.body.appendChild(this.domElement);
    }

    this.__controllers = [];
    this.__folders = [];
    this.closed = false;
  }

  add(object, property, min, max, step) {
    const controller = new Controller(this, object, property, min, max, step);
    this.__controllers.push(controller);
    return controller;
  }

  addFolder(name) {
    const folder = new GUI({ autoPlace: false, title: name });
    folder.domElement.classList.add("dat-gui-folder");
    this.__folders.push(folder);
    this._body.appendChild(folder.domElement);
    return folder;
  }

  open() {
    this.closed = false;
    this.domElement.style.display = "block";
  }

  close() {
    this.closed = true;
    this.domElement.style.display = "none";
  }

  destroy() {
    for (const controller of this.__controllers) {
      controller.destroy();
    }
    for (const folder of this.__folders) {
      folder.destroy();
    }
    if (this.domElement?.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }
  }
}
