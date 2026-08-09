import { app } from "../../scripts/app.js";

const NODE_ID = "ComfyUILoraLoaderMultiLoraLoader";
const LORA_ENDPOINT = "/multi-lora-loader/loras";

function defaultRow() {
  return { enabled: true, lora: "", strength: 1 };
}

function parseRows(value) {
  try {
    const rows = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      enabled: row?.enabled !== false,
      lora: typeof row?.lora === "string" ? row.lora : "",
      // Read the early two-strength format for workflow compatibility, but
      // save all new rows using one RGThree-style strength value.
      strength: Number.isFinite(Number(row?.strength))
        ? Number(row.strength)
        : Number.isFinite(Number(row?.model_strength))
          ? Number(row.model_strength)
          : 1,
    }));
  } catch {
    return [];
  }
}

function makeButton(label, title, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function roundedStrength(value) {
  return Math.round(value * 100) / 100;
}

function installEditor(node) {
  if (node._multiLoraEditorInstalled) return;
  node._multiLoraEditorInstalled = true;

  // Older workflows have a generated String widget. Remove it if present;
  // new node definitions intentionally have no schema-level `loras` input.
  const serializedWidget = node.widgets?.find((widget) => widget.name === "loras");
  const initialValue = serializedWidget?.value ?? "[]";
  if (serializedWidget) node.widgets.splice(node.widgets.indexOf(serializedWidget), 1);

  const root = document.createElement("div");
  root.className = "multi-lora-loader";
  const style = document.createElement("style");
  style.textContent = `
    .multi-lora-loader { box-sizing:border-box; min-width:300px; color:var(--fg-color,#ddd); font:12px sans-serif; padding:5px; }
    .multi-lora-loader * { box-sizing:border-box; }
    .multi-lora-loader__row { display:grid; grid-template-columns:auto minmax(0,1fr) 88px 23px; gap:3px; align-items:center; margin:3px 0; }
    .multi-lora-loader button, .multi-lora-loader select, .multi-lora-loader input { min-width:0; border:1px solid var(--border-color,#555); border-radius:3px; background:var(--comfy-input-bg,#222); color:inherit; font:inherit; padding:3px; }
    .multi-lora-loader button { cursor:pointer; }
    .multi-lora-loader button:disabled { cursor:default; opacity:.45; }
    .multi-lora-loader__strength { display:grid; grid-template-columns:18px 1fr 18px; align-items:center; height:24px; overflow:hidden; border:1px solid var(--border-color,#555); border-radius:7px; background:var(--comfy-input-bg,#222); }
    .multi-lora-loader__strength button { height:100%; border:0; border-radius:0; background:transparent; padding:0; font-size:0; line-height:1; }
    .multi-lora-loader__strength button:hover { background:color-mix(in srgb, currentColor 10%, transparent); }
    .multi-lora-loader__strength-arrow::before { content:""; display:block; width:0; height:0; margin:auto; border-top:4px solid transparent; border-bottom:4px solid transparent; }
    .multi-lora-loader__strength-arrow--left::before { border-right:7px solid currentColor; }
    .multi-lora-loader__strength-arrow--right::before { border-left:7px solid currentColor; }
    .multi-lora-loader__strength input { width:100%; height:100%; border:0; border-left:1px solid var(--border-color,#555); border-right:1px solid var(--border-color,#555); border-radius:0; background:transparent; padding:0 2px; text-align:center; appearance:textfield; }
    .multi-lora-loader__strength input::-webkit-inner-spin-button, .multi-lora-loader__strength input::-webkit-outer-spin-button { appearance:none; margin:0; }
    .multi-lora-loader__remove { width:23px; height:24px; padding:0 !important; display:grid; place-items:center; font-size:13px; line-height:1; }
    .multi-lora-loader__row.is-disabled { opacity:.48; }
    .multi-lora-loader__empty { opacity:.7; padding:4px 0; text-align:center; }
    .multi-lora-loader__add { display:block; margin:7px auto 1px; padding:4px 9px; }
  `;
  root.append(style);

  let rows = parseRows(initialValue);
  let loras = [];
  let domWidget;
  const save = () => {
    // DOMWidget serializes via getValue below. Updating value keeps its normal
    // workflow-change lifecycle intact without creating a second widget.
    domWidget.value = JSON.stringify(rows);
    node.graph?.setDirtyCanvas(true, true);
  };
  const render = () => {
    const state = root.querySelector(".multi-lora-loader__content");
    state?.remove();
    const content = document.createElement("div");
    content.className = "multi-lora-loader__content";
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "multi-lora-loader__empty";
      empty.textContent = "No LoRAs added.";
      content.append(empty);
    }
    rows.forEach((row, index) => {
      const line = document.createElement("div");
      line.className = `multi-lora-loader__row${row.enabled ? "" : " is-disabled"}`;
      const enabled = document.createElement("input");
      enabled.type = "checkbox";
      enabled.checked = row.enabled;
      enabled.title = "Enable this LoRA";
      enabled.addEventListener("change", () => { row.enabled = enabled.checked; save(); render(); });
      const select = document.createElement("select");
      const placeholder = new Option(loras.length ? "Select a LoRA…" : "No LoRAs found", "");
      select.add(placeholder);
      loras.forEach((name) => select.add(new Option(name, name)));
      select.value = row.lora;
      select.addEventListener("change", () => { row.lora = select.value; save(); });
      const strengthBox = document.createElement("div");
      strengthBox.className = "multi-lora-loader__strength";
      strengthBox.title = "Strength (applied to model and CLIP)";
      const strength = document.createElement("input");
      strength.type = "number"; strength.step = "0.05"; strength.value = String(row.strength);
      strength.setAttribute("aria-label", "Strength");
      strength.addEventListener("change", () => {
        const value = Number(strength.value);
        if (Number.isFinite(value)) row.strength = value;
        else strength.value = String(row.strength);
        save();
      });
      const decrease = makeButton("Decrease", "Decrease strength by 0.05", () => {
        row.strength = roundedStrength(row.strength - 0.05); save(); render();
      });
      decrease.className = "multi-lora-loader__strength-arrow multi-lora-loader__strength-arrow--left";
      const increase = makeButton("Increase", "Increase strength by 0.05", () => {
        row.strength = roundedStrength(row.strength + 0.05); save(); render();
      });
      increase.className = "multi-lora-loader__strength-arrow multi-lora-loader__strength-arrow--right";
      strengthBox.append(decrease, strength, increase);
      const remove = makeButton("×", "Remove", () => { rows.splice(index, 1); save(); render(); });
      remove.className = "multi-lora-loader__remove";
      line.append(enabled, select, strengthBox, remove);
      content.append(line);
    });
    const add = makeButton("+ Add LoRA", "Add a LoRA row", () => {
      rows.push(defaultRow()); save(); render();
    });
    add.className = "multi-lora-loader__add";
    content.append(add);
    root.append(content);
    const height = Math.max(42, 36 + rows.length * 35);
    domWidget.computeSize = (width) => [width, height];
    node.setSize([Math.max(node.size[0], 360), node.computeSize()[1]]);
  };
  domWidget = node.addDOMWidget("loras", "MULTI_LORA_ROWS", root, {
    hideOnZoom: false,
    getHeight: () => Math.max(42, 36 + rows.length * 35),
    getValue: () => JSON.stringify(rows),
    setValue: (value) => {
      rows = parseRows(value);
      render();
    },
  });
  fetchLoras();
  render();

  async function fetchLoras() {
    try {
      const response = await app.api.fetchApi(LORA_ENDPOINT);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      loras = await response.json();
      render();
    } catch (error) {
      console.warn("Multi Lora Loader could not fetch the LoRA list.", error);
    }
  }
}

app.registerExtension({
  name: "comfyui-lora-loader.multi-lora-loader",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_ID) return;
    const originalCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function onNodeCreated(...args) {
      const result = originalCreated?.apply(this, args);
      installEditor(this);
      return result;
    };
  },
});
