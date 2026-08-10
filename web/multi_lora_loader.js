import { app } from "../../scripts/app.js";

const NODE_ID = "ComfyUILoraLoaderMultiLoraLoader";
const LORA_ENDPOINT = "/multi-lora-loader/loras";
const loraListRefreshers = new Set();

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

function makeIcon(name) {
  const icon = document.createElement("i");
  icon.className = `icon-[lucide--${name}] size-4 bg-muted-foreground`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function createLoraPicker({ getLoras, getValue, setValue }) {
  const picker = document.createElement("div");
  picker.className = "multi-lora-loader__picker bg-component-node-widget-background not-disabled:text-component-node-foreground [[readonly]]:bg-component-node-widget-background-disabled border-none rounded-md flex w-full min-w-0 items-center overflow-hidden h-6 hover:bg-component-node-widget-background-hovered";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "multi-lora-loader__picker-trigger flex min-w-0 flex-1 cursor-pointer items-center overflow-hidden border-none bg-transparent p-0 outline-none disabled:cursor-default";
  trigger.setAttribute("aria-label", "LoRA name");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("role", "combobox");
  const indicator = document.createElement("button");
  indicator.type = "button";
  indicator.tabIndex = -1;
  indicator.setAttribute("aria-hidden", "true");
  indicator.className = "multi-lora-loader__picker-indicator flex h-full w-6 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent outline-none disabled:cursor-default";
  indicator.append(makeIcon("chevron-down"));
  picker.append(trigger, indicator);

  let menu;
  let query = "";
  let activeIndex = 0;

  const getMatches = () => {
    const needle = query.trim().toLocaleLowerCase();
    return getLoras().filter((name) => name.toLocaleLowerCase().includes(needle));
  };
  const close = () => {
    menu?.remove();
    menu = undefined;
    trigger.setAttribute("aria-expanded", "false");
  };
  const choose = (value) => {
    setValue(value);
    close();
  };
  const updateButton = () => {
    const value = getValue();
    const label = document.createElement("span");
    label.className = "multi-lora-loader__picker-label min-w-[4ch] flex-1 truncate pr-1 pl-2 text-left text-xs";
    label.textContent = value || (getLoras().length ? "Select a LoRA…" : "No LoRAs found");
    trigger.replaceChildren(label);
    picker.classList.toggle("is-placeholder", !value);
    trigger.title = value || "Select a LoRA";
  };
  const positionMenu = () => {
    if (!menu) return;
    const rect = picker.getBoundingClientRect();
    const margin = 6;
    menu.style.width = `${Math.max(rect.width, 240)}px`;
    menu.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - menu.offsetWidth - margin))}px`;
    const top = rect.bottom + margin;
    menu.style.top = `${top + menu.offsetHeight <= window.innerHeight - margin
      ? top
      : Math.max(margin, rect.top - menu.offsetHeight - margin)}px`;
  };
  const renderMenu = () => {
    if (!menu) return;
    const list = menu.querySelector(".multi-lora-loader__picker-options");
    list.replaceChildren();
    const matches = getMatches();
    activeIndex = Math.min(Math.max(activeIndex, 0), Math.max(matches.length - 1, 0));
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "multi-lora-loader__picker-empty";
      empty.textContent = "No matching LoRAs";
      list.append(empty);
      positionMenu();
      return;
    }
    matches.forEach((name, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "multi-lora-loader__picker-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(name === getValue()));
      option.classList.toggle("is-active", index === activeIndex);
      option.textContent = name;
      if (name === getValue()) {
        const check = document.createElement("span");
        check.className = "multi-lora-loader__picker-check";
        check.textContent = "✓";
        option.append(check);
      }
      option.addEventListener("click", () => choose(name));
      list.append(option);
    });
    positionMenu();
  };
  const open = () => {
    if (menu) return close();
    query = "";
    activeIndex = Math.max(getMatches().indexOf(getValue()), 0);
    menu = document.createElement("div");
    menu.className = "multi-lora-loader__picker-menu";
    menu.setAttribute("role", "dialog");
    const search = document.createElement("input");
    search.type = "search";
    search.className = "multi-lora-loader__picker-search";
    search.placeholder = "Search LoRAs…";
    search.setAttribute("aria-label", "Search LoRAs");
    const searchWrap = document.createElement("div");
    searchWrap.className = "multi-lora-loader__picker-search-wrap";
    const searchIcon = document.createElement("i");
    searchIcon.className = "icon-[lucide--search] shrink-0 text-sm text-muted-foreground";
    searchIcon.setAttribute("aria-hidden", "true");
    searchWrap.append(searchIcon, search);
    const list = document.createElement("div");
    list.className = "multi-lora-loader__picker-options";
    list.setAttribute("role", "listbox");
    search.addEventListener("input", () => { query = search.value; activeIndex = 0; renderMenu(); });
    search.addEventListener("keydown", (event) => {
      const matches = getMatches();
      if (event.key === "ArrowDown") { activeIndex = Math.min(activeIndex + 1, matches.length - 1); event.preventDefault(); renderMenu(); }
      else if (event.key === "ArrowUp") { activeIndex = Math.max(activeIndex - 1, 0); event.preventDefault(); renderMenu(); }
      else if (event.key === "Enter" && matches[activeIndex]) { event.preventDefault(); choose(matches[activeIndex]); }
      else if (event.key === "Escape") { event.preventDefault(); close(); trigger.focus(); }
    });
    menu.append(searchWrap, list);
    document.body.append(menu);
    trigger.setAttribute("aria-expanded", "true");
    renderMenu();
    requestAnimationFrame(() => { positionMenu(); search.focus(); });
  };
  const toggleMenu = (event) => { event.preventDefault(); event.stopPropagation(); open(); };
  trigger.addEventListener("click", toggleMenu);
  indicator.addEventListener("click", toggleMenu);
  trigger.addEventListener("keydown", (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) { event.preventDefault(); open(); }
  });
  const onDocumentPointerDown = (event) => {
    if (menu && !menu.contains(event.target) && !picker.contains(event.target)) close();
  };
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  updateButton();
  return { element: picker, update: updateButton, close, destroy: () => { close(); document.removeEventListener("pointerdown", onDocumentPointerDown, true); } };
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
    .multi-lora-loader__row { display:grid; grid-template-columns:auto minmax(0,1fr) 94px 24px; gap:4px; align-items:center; min-height:28px; margin:3px 0; }
    .multi-lora-loader button, .multi-lora-loader input { min-width:0; border:0; border-radius:4px; background:transparent; color:inherit; font:inherit; }
    .multi-lora-loader button { cursor:pointer; }
    .multi-lora-loader button:disabled { cursor:default; opacity:.45; }
    .multi-lora-loader button:focus-visible, .multi-lora-loader input:focus-visible { outline:1px solid var(--p-primary-color,var(--primary-color,#4aa3ff)); outline-offset:1px; }
    .multi-lora-loader__strength { display:grid; grid-template-columns:24px minmax(0,1fr) 24px; align-items:center; height:28px; border-radius:4px; }
    .multi-lora-loader__strength button { display:grid; width:24px; height:24px; place-items:center; padding:0; }
    .multi-lora-loader__strength button:hover, .multi-lora-loader__remove:hover { background:color-mix(in srgb, var(--fg-color,#ddd) 10%, transparent); }
    .multi-lora-loader__strength input { width:100%; height:24px; padding:0 2px; text-align:center; appearance:textfield; }
    .multi-lora-loader__strength input::-webkit-inner-spin-button, .multi-lora-loader__strength input::-webkit-outer-spin-button { appearance:none; margin:0; }
    .multi-lora-loader__remove { width:24px; height:24px; padding:0; display:grid; place-items:center; }
    .multi-lora-loader__picker { height:24px; color:var(--fg-color,#ddd); }
    .multi-lora-loader__picker-trigger { height:100%; color:inherit; }
    .multi-lora-loader__picker-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .multi-lora-loader__picker-indicator { color:inherit; }
    .multi-lora-loader__picker-indicator > i { opacity:.75; }
    .multi-lora-loader__picker.is-placeholder { opacity:.7; }
    .multi-lora-loader__picker-menu { position:fixed; z-index:10000; overflow:hidden; border:1px solid var(--border-color,#555); border-radius:8px; background:var(--comfy-menu-bg,#222); color:var(--fg-color,#ddd); box-shadow:0 8px 20px #0009; font:14px sans-serif; }
    .multi-lora-loader__picker-search-wrap { position:relative; }
    .multi-lora-loader__picker-search { display:block; width:calc(100% - 10px); height:32px; margin:5px; border:1px solid #1688d4; border-radius:7px; outline:0; background:var(--comfy-input-bg,#191919); color:inherit; padding:4px 8px 4px 31px; }
    .multi-lora-loader__picker-search-wrap > i { position:absolute; z-index:1; left:14px; top:50%; transform:translateY(-50%); pointer-events:none; }
    .multi-lora-loader__picker-options { display:grid; gap:3px; max-height:250px; overflow-y:auto; padding:2px 5px 8px; }
    .multi-lora-loader__picker-option { display:flex; width:100%; min-height:32px; align-items:center; border:0 !important; border-radius:5px !important; background:transparent !important; color:inherit; padding:5px 7px !important; text-align:left; }
    .multi-lora-loader__picker-option:hover, .multi-lora-loader__picker-option.is-active { background:#214d70 !important; }
    .multi-lora-loader__picker-check { margin-left:auto; padding-left:8px; font-size:16px; }
    .multi-lora-loader__picker-empty { padding:12px 10px; opacity:.7; text-align:center; }
    .multi-lora-loader__row.is-disabled { opacity:.48; }
    .multi-lora-loader__empty { opacity:.7; padding:4px 0; text-align:center; }
    .multi-lora-loader__add { display:block; margin:7px auto 1px; padding:4px 9px; }
  `;
  root.append(style);

  let rows = parseRows(initialValue);
  let loras = [];
  let pickers = [];
  let domWidget;
  const save = () => {
    // DOMWidget serializes via getValue below. Updating value keeps its normal
    // workflow-change lifecycle intact without creating a second widget.
    domWidget.value = JSON.stringify(rows);
    node.graph?.setDirtyCanvas(true, true);
  };
  const render = () => {
    pickers.forEach((picker) => picker.destroy());
    pickers = [];
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
      const picker = createLoraPicker({
        getLoras: () => loras,
        getValue: () => row.lora,
        setValue: (value) => { row.lora = value; save(); render(); },
      });
      pickers.push(picker);
      const strengthBox = document.createElement("div");
      strengthBox.className = "multi-lora-loader__strength bg-component-node-widget-background not-disabled:text-component-node-foreground hover:bg-component-node-widget-background-hovered";
      strengthBox.title = "Strength (applied to model and CLIP)";
      const strength = document.createElement("input");
      strength.type = "number"; strength.step = "0.05"; strength.value = row.strength.toFixed(2);
      strength.setAttribute("aria-label", "Strength");
      strength.addEventListener("change", () => {
        const value = Number(strength.value);
        if (Number.isFinite(value)) row.strength = value;
        strength.value = row.strength.toFixed(2);
        save();
      });
      const decrease = makeButton("", "Decrease strength by 0.05", () => {
        row.strength = roundedStrength(row.strength - 0.05); save(); render();
      });
      decrease.className = "multi-lora-loader__strength-button";
      decrease.setAttribute("aria-label", "Decrease strength by 0.05");
      decrease.append(makeIcon("minus"));
      const increase = makeButton("", "Increase strength by 0.05", () => {
        row.strength = roundedStrength(row.strength + 0.05); save(); render();
      });
      increase.className = "multi-lora-loader__strength-button";
      increase.setAttribute("aria-label", "Increase strength by 0.05");
      increase.append(makeIcon("plus"));
      strengthBox.append(decrease, strength, increase);
      const remove = makeButton("×", "Remove", () => { rows.splice(index, 1); save(); render(); });
      remove.className = "multi-lora-loader__remove";
      line.append(enabled, picker.element, strengthBox, remove);
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

  loraListRefreshers.add(fetchLoras);
  const originalRemoved = node.onRemoved;
  node.onRemoved = function onRemoved(...args) {
    loraListRefreshers.delete(fetchLoras);
    pickers.forEach((picker) => picker.destroy());
    pickers = [];
    return originalRemoved?.apply(this, args);
  };
}

app.registerExtension({
  name: "comfyui-lora-loader.multi-lora-loader",
  async setup() {
    // ComfyUI calls this method after its Reload Models / Refresh Node
    // Definitions action has rebuilt built-in combo lists. Mirror that update
    // for our custom DOM selectors as well.
    if (app._multiLoraLoaderRefreshHookInstalled || !app.refreshComboInNodes) return;
    app._multiLoraLoaderRefreshHookInstalled = true;
    const refreshCombos = app.refreshComboInNodes.bind(app);
    app.refreshComboInNodes = async function refreshComboInNodes(...args) {
      const result = await refreshCombos(...args);
      await Promise.allSettled([...loraListRefreshers].map((refresh) => refresh()));
      return result;
    };
  },
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
