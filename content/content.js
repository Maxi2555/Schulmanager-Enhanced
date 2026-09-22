(function () {
  "use strict";

  /* =========================================================
     Konstanten
     ========================================================= */
  const THEME_KEY = "smcuTheme";
  const ACCENT_KEY = "smcuAccent";
  const CUSTOM_CSS_KEY = "smcuCustomCss";
  const LANDING_KEY = "smcuLandingPage";
  const MODULE_ORDER_KEY = "smcuModuleOrder";
  const MODULE_CACHE_KEY = "smcuModuleCache";

  const SMCU_THEMES = [
    { id: "light", label: "Hell" },
    { id: "dark", label: "Dunkel" },
    { id: "nitro-purple", label: "Nitro Purple" },
    { id: "nitro-aurora", label: "Nitro Aurora" },
    { id: "nitro-sunset", label: "Nitro Sunset" },
    { id: "nitro-emerald", label: "Nitro Emerald" },
    { id: "nitro-cherry", label: "Nitro Cherry" },
    { id: "nitro-cyber", label: "Nitro Cyber" },
    { id: "nitro-gold", label: "Nitro Gold" },
    { id: "nitro-ocean", label: "Nitro Ocean" },
    { id: "nitro-galaxy", label: "Nitro Galaxy \u2728" },
    { id: "nitro-lava", label: "Nitro Lava \u2728" },
    { id: "nitro-candy", label: "Nitro Candy \u2728" },
    { id: "nitro-neon", label: "Nitro Neon \u2728" },
    { id: "nitro-royale", label: "Nitro Royale \u2728" },
  ];
  const SMCU_DARK_BASE = new Set([
    "dark",
    "nitro-purple", "nitro-aurora", "nitro-sunset",
    "nitro-emerald", "nitro-cherry", "nitro-cyber", "nitro-gold", "nitro-ocean",
    "nitro-galaxy", "nitro-lava", "nitro-candy", "nitro-neon", "nitro-royale",
  ]);
  // "Prominente" Themes: zusätzlich farbiger Seitenhintergrund + stärkere Transparenz
  const SMCU_PROMINENT = new Set(["nitro-galaxy", "nitro-lava", "nitro-candy", "nitro-neon", "nitro-royale"]);

  const PERIODS = [
    { n: 1, start: "07:55", end: "08:40" },
    { n: 2, start: "08:45", end: "09:30" },
    { n: 3, start: "09:50", end: "10:35" },
    { n: 4, start: "10:40", end: "11:25" },
    { n: 5, start: "11:45", end: "12:30" },
    { n: 6, start: "12:35", end: "13:20" },
    { n: 7, start: "13:30", end: "14:15" },
    { n: 8, start: "14:20", end: "15:05" },
    { n: 9, start: "15:10", end: "15:55" },
    { n: 10, start: "16:00", end: "16:45" },
    { n: 11, start: "16:50", end: "17:35" },
  ];

  const SUBJECT_PALETTE = [
    "#5865F2", "#EB459E", "#57F287", "#f0b429", "#00c6ff",
    "#ff512f", "#7b2ff7", "#22c55e", "#f97316", "#06b6d4",
    "#e11d48", "#a855f7",
  ];

  let currentTimetableTable = null;
  let currentTodayColIndex = -1;

  /* =========================================================
     Kleine Hilfsfunktionen
     ========================================================= */
  async function getStored(key, fallback) {
    const res = await browser.storage.local.get(key);
    return key in res ? res[key] : fallback;
  }
  async function setStored(key, value) {
    await browser.storage.local.set({ [key]: value });
  }

  function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
    const bigint = parseInt(full, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }
  function generateGradientFromAccent(hex) {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const secondary = hslToHex((h + 40) % 360, Math.min(s + 10, 100), Math.min(l + 8, 90));
    return `linear-gradient(135deg, ${hex}, ${secondary})`;
  }
  function colorForSubject(text) {
    if (!text) return SUBJECT_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
  }
  function getComputedAccent() {
    return getComputedStyle(document.documentElement).getPropertyValue("--smcu-accent").trim() || "#2f6f4e";
  }

  function waitForSelector(selector, timeoutMs) {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { obs.disconnect(); resolve(el); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(document.querySelector(selector)); }, timeoutMs || 4000);
    });
  }

  /* =========================================================
     Theme & Custom CSS
     ========================================================= */
  function applyTheme(themeId) {
    const root = document.documentElement;
    SMCU_THEMES.forEach((t) => root.classList.remove(`smcu-theme-${t.id}`));
    root.classList.add(`smcu-theme-${themeId}`);
    root.classList.toggle("smcu-dark-base", SMCU_DARK_BASE.has(themeId));
    root.classList.toggle("smcu-prominent", SMCU_PROMINENT.has(themeId));
  }

  function applyAccent(hex) {
    const root = document.documentElement;
    if (!hex) {
      root.style.removeProperty("--smcu-accent");
      root.style.removeProperty("--smcu-accent-rgb");
      root.style.removeProperty("--smcu-accent-grad");
      return;
    }
    const [r, g, b] = hexToRgb(hex);
    root.style.setProperty("--smcu-accent", hex);
    root.style.setProperty("--smcu-accent-rgb", `${r},${g},${b}`);
    root.style.setProperty("--smcu-accent-grad", generateGradientFromAccent(hex));
  }

  function applyCustomCss(css) {
    let tag = document.getElementById("smcu-custom-css-tag");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "smcu-custom-css-tag";
      document.head.appendChild(tag);
    }
    tag.textContent = css || "";
  }

  /* =========================================================
     Modul-Scraping (Sidebar-Inhalte)
     Hinweis: Das Dropdown-Menü und die Konto-/Mobile-Menüs
     stehen bei Schulmanager permanent im DOM (nur per CSS
     versteckt) - kein Öffnen/Klicken nötig.
     ========================================================= */
  function scrapeModuleMenu() {
    const menu = document.querySelector(".dropdown-menu.module-overview");
    if (!menu) return null;
    const items = [];
    menu.querySelectorAll("a.dropdown-item.module-label").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const iconEl = a.querySelector("span.fa");
      const icon = iconEl
        ? [...iconEl.classList].find((c) => c.startsWith("fa-") && c !== "fa-fw")
        : null;
      items.push({ href, label: a.textContent.trim(), icon: icon || "fa-circle-o" });
    });
    return items.length ? items : null;
  }

  async function refreshModuleList() {
    const items = scrapeModuleMenu();
    if (items) await setStored(MODULE_CACHE_KEY, items);
    return items;
  }

  function mergeOrder(cache, order) {
    const byHref = new Map(cache.map((item) => [item.href, item]));
    const ordered = order.map((href) => byHref.get(href)).filter(Boolean);
    const seen = new Set(ordered.map((i) => i.href));
    for (const item of cache) {
      if (!seen.has(item.href)) ordered.push(item);
    }
    return ordered;
  }

  function scrapeAccountExtras() {
    const items = [];
    const mobileMenu = document.getElementById("mobile-menu");
    if (!mobileMenu) return items;
    const map = [
      { selector: 'a[href="#/account"]', label: "Mein Account", icon: "fa-user" },
      { selector: 'a[href="#/notifications/view"]', label: "Benachrichtigungen", icon: "fa-bell-o" },
      { selector: 'a[href="#/imprint"]', label: "Impressum", icon: "fa-map-marker" },
      { selector: 'a[href="#/privacy"]', label: "Datenschutz", icon: "fa-user-secret" },
    ];
    map.forEach(({ selector, label, icon }) => {
      const a = mobileMenu.querySelector(selector);
      if (a) items.push({ href: a.getAttribute("href"), label, icon, type: "link" });
    });
    const logoutBtn = mobileMenu.querySelector("li > button");
    if (logoutBtn) items.push({ label: "Ausloggen", icon: "fa-sign-out", type: "logout" });
    return items;
  }

  /* =========================================================
     Sidebar: Aufbau & Rendering
     ========================================================= */
  function closeSidebarMobile() {
    const sb = document.getElementById("smcu-sidebar");
    if (sb) sb.classList.remove("smcu-open");
  }

  function buildSidebarSkeleton() {
    if (document.getElementById("smcu-sidebar")) return;

    const toggle = document.createElement("button");
    toggle.id = "smcu-mobile-toggle";
    toggle.title = "Menü";
    toggle.innerHTML = "\u2630";
    toggle.addEventListener("click", () => {
      document.getElementById("smcu-sidebar").classList.toggle("smcu-open");
    });

    const sidebar = document.createElement("div");
    sidebar.id = "smcu-sidebar";
    sidebar.innerHTML = `
      <div id="smcu-sidebar-brand">
        <img src="" alt="" id="smcu-sidebar-logo" />
        <span>Schulmanager Enhanced</span>
      </div>
      <div class="smcu-sidebar-section-title">Module</div>
      <ul id="smcu-sidebar-list"></ul>
      <div id="smcu-sidebar-empty" style="display:none;">Keine Module gefunden.</div>
      <div class="smcu-sidebar-section-title">Konto</div>
      <ul id="smcu-sidebar-extras"></ul>
      <div id="smcu-sidebar-footer">
        <button id="smcu-settings-gear" title="Einstellungen">\u2699 Einstellungen</button>
      </div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(sidebar);

    const originalLogo = document.querySelector(".sm-navbar .logo img");
    const sidebarLogo = document.getElementById("smcu-sidebar-logo");
    if (originalLogo && sidebarLogo) {
      sidebarLogo.src = originalLogo.src;
      sidebarLogo.alt = originalLogo.alt || "Logo";
    }

    document.getElementById("smcu-sidebar-brand").addEventListener("click", () => {
      location.hash = "#/dashboard";
      if (window.innerWidth <= 900) closeSidebarMobile();
    });

    document.getElementById("smcu-settings-gear").addEventListener("click", () => {
      const overlay = document.getElementById("smcu-settings-overlay");
      if (overlay) overlay.classList.add("smcu-open");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth > 900) return;
      if (sidebar.classList.contains("smcu-open") && !sidebar.contains(e.target) && e.target !== toggle) {
        sidebar.classList.remove("smcu-open");
      }
    });
  }

  function attachDragHandlers(list) {
    let draggedEl = null;
    list.querySelectorAll("li").forEach((li) => {
      li.addEventListener("dragstart", () => {
        draggedEl = li;
        li.classList.add("smcu-dragging");
      });
      li.addEventListener("dragend", () => {
        li.classList.remove("smcu-dragging");
        list.querySelectorAll("li").forEach((el) => el.classList.remove("smcu-drag-over"));
      });
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (li !== draggedEl) li.classList.add("smcu-drag-over");
      });
      li.addEventListener("dragleave", () => li.classList.remove("smcu-drag-over"));
      li.addEventListener("drop", async (e) => {
        e.preventDefault();
        li.classList.remove("smcu-drag-over");
        if (!draggedEl || draggedEl === li) return;
        const items = [...list.querySelectorAll("li")];
        const fromIdx = items.indexOf(draggedEl);
        const toIdx = items.indexOf(li);
        if (fromIdx < toIdx) li.after(draggedEl); else li.before(draggedEl);
        const newOrder = [...list.querySelectorAll("li")].map((el) => el.dataset.href);
        await setStored(MODULE_ORDER_KEY, newOrder);
      });
    });
  }

  async function renderSidebarModules() {
    const list = document.getElementById("smcu-sidebar-list");
    const emptyEl = document.getElementById("smcu-sidebar-empty");
    if (!list) return;
    const cache = await getStored(MODULE_CACHE_KEY, []);
    const order = await getStored(MODULE_ORDER_KEY, []);
    const items = mergeOrder(cache, order);

    list.innerHTML = "";
    if (!items.length) {
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    items.forEach((item) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.dataset.href = item.href;
      li.innerHTML = `<span class="fa ${item.icon} fa-fw" aria-hidden="true"></span><a href="${item.href}">${item.label}</a>`;
      list.appendChild(li);
    });
    attachDragHandlers(list);
    list.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => { if (window.innerWidth <= 900) closeSidebarMobile(); });
    });
  }

  function renderSidebarExtras() {
    const list = document.getElementById("smcu-sidebar-extras");
    if (!list) return;
    const extras = scrapeAccountExtras();
    list.innerHTML = "";
    extras.forEach((item) => {
      const li = document.createElement("li");
      if (item.type === "logout") {
        li.innerHTML = `<span class="fa ${item.icon} fa-fw" aria-hidden="true"></span><button type="button" class="smcu-logout-btn">${item.label}</button>`;
        li.querySelector("button").addEventListener("click", () => {
          const btn = document.querySelector("#mobile-menu li > button");
          if (btn) btn.click();
        });
      } else {
        li.innerHTML = `<span class="fa ${item.icon} fa-fw" aria-hidden="true"></span><a href="${item.href}">${item.label}</a>`;
        li.querySelector("a").addEventListener("click", () => { if (window.innerWidth <= 900) closeSidebarMobile(); });
      }
      list.appendChild(li);
    });
  }

  /* =========================================================
     Einstellungsdialog
     ========================================================= */
  function buildSettingsModal() {
    if (document.getElementById("smcu-settings-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "smcu-settings-overlay";
    overlay.innerHTML = `
      <div id="smcu-settings-modal">
        <div class="smcu-settings-header">
          <strong>Schulmanager Enhanced</strong>
          <button id="smcu-settings-close">\u2715</button>
        </div>
        <div class="smcu-settings-body">
          <section>
            <h4>Theme</h4>
            <div id="smcu-theme-options"></div>
          </section>
          <section>
            <h4>Akzentfarbe</h4>
            <input type="color" id="smcu-accent-input" />
            <button id="smcu-accent-reset" class="smcu-link-btn">Zurücksetzen</button>
          </section>
          <section>
            <h4>Startseite</h4>
            <select id="smcu-landing-select"></select>
          </section>
          <section>
            <h4>Eigenes CSS</h4>
            <textarea id="smcu-custom-css-input" rows="6" placeholder="/* eigenes CSS hier einfügen */"></textarea>
          </section>
          <section>
            <button id="smcu-refresh-modules-btn" class="smcu-secondary-btn">Module neu einlesen</button>
          </section>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const themeContainer = overlay.querySelector("#smcu-theme-options");
    SMCU_THEMES.forEach((t) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "smcu-theme-swatch";
      card.dataset.theme = t.id;
      card.innerHTML = `<span class="smcu-swatch-preview smcu-swatch-${t.id}"></span><span>${t.label}</span>`;
      card.addEventListener("click", async () => {
        await setStored(THEME_KEY, t.id);
        applyTheme(t.id);
        highlightActiveTheme(t.id);
      });
      themeContainer.appendChild(card);
    });

    overlay.querySelector("#smcu-settings-close").addEventListener("click", () => {
      overlay.classList.remove("smcu-open");
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("smcu-open");
    });

    const accentInput = overlay.querySelector("#smcu-accent-input");
    accentInput.addEventListener("input", async (e) => {
      await setStored(ACCENT_KEY, e.target.value);
      applyAccent(e.target.value);
    });
    overlay.querySelector("#smcu-accent-reset").addEventListener("click", async () => {
      await setStored(ACCENT_KEY, "");
      applyAccent("");
      accentInput.value = getComputedAccent();
    });

    const cssInput = overlay.querySelector("#smcu-custom-css-input");
    let cssDebounce;
    cssInput.addEventListener("input", (e) => {
      clearTimeout(cssDebounce);
      const value = e.target.value;
      cssDebounce = setTimeout(async () => {
        await setStored(CUSTOM_CSS_KEY, value);
        applyCustomCss(value);
      }, 400);
    });

    overlay.querySelector("#smcu-landing-select").addEventListener("change", async (e) => {
      await setStored(LANDING_KEY, e.target.value);
    });

    overlay.querySelector("#smcu-refresh-modules-btn").addEventListener("click", async () => {
      await refreshModuleList();
      await populateLandingSelect();
      await renderSidebarModules();
      renderSidebarExtras();
    });
  }

  function highlightActiveTheme(themeId) {
    document.querySelectorAll(".smcu-theme-swatch").forEach((el) => {
      el.classList.toggle("smcu-active", el.dataset.theme === themeId);
    });
  }

  async function populateLandingSelect() {
    const select = document.getElementById("smcu-landing-select");
    if (!select) return;
    const cache = await getStored(MODULE_CACHE_KEY, []);
    const current = await getStored(LANDING_KEY, "");
    select.innerHTML =
      '<option value="">Startseite (Dashboard)</option>' +
      cache.map((m) => `<option value="${m.href}">${m.label}</option>`).join("");
    select.value = current || "";
  }

  async function initSettingsValues() {
    const theme = await getStored(THEME_KEY, "light");
    applyTheme(theme);
    highlightActiveTheme(theme);

    const accent = await getStored(ACCENT_KEY, "");
    applyAccent(accent);
    const accentInput = document.getElementById("smcu-accent-input");
    if (accentInput) accentInput.value = accent || getComputedAccent();

    const css = await getStored(CUSTOM_CSS_KEY, "");
    applyCustomCss(css);
    const cssInput = document.getElementById("smcu-custom-css-input");
    if (cssInput) cssInput.value = css;

    await populateLandingSelect();
  }

  /* =========================================================
     Landing Page (nur beim initialen Laden der Seite)
     ========================================================= */
  async function applyLandingRedirectOnce() {
    const landing = await getStored(LANDING_KEY, "");
    if (!landing) return;
    const h = location.hash;
    if (h === "" || h === "#" || h === "#/" || h === "#/dashboard" || h === "#/dashboard/") {
      location.hash = landing;
    }
  }

  /* =========================================================
     Stundenplan-Redesign
     ========================================================= */
  function enhanceTimetable() {
    const table = document.querySelector("table.calendar-table");
    if (!table) {
      currentTimetableTable = null;
      return;
    }

    let wrap = table.parentElement;
    if (!wrap.classList.contains("smcu-timetable-wrap")) {
      wrap = document.createElement("div");
      wrap.className = "smcu-timetable-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
    addTimetableExportButton(wrap);

    const headerCells = [...table.querySelectorAll("thead th")];
    if (!headerCells.length) return;
    const totalCols = headerCells.length;

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.`;
    let todayColIndex = -1;
    headerCells.forEach((th, idx) => {
      th.classList.remove("smcu-today-col");
      if (idx === 0) return;
      if (th.textContent.includes(todayStr)) {
        todayColIndex = idx;
        th.classList.add("smcu-today-col");
      }
    });

    // Vorher eingefügte Pausen-Zeilen entfernen (Angular kann die Woche neu rendern)
    table.querySelectorAll("tbody > tr.smcu-break-row").forEach((r) => r.remove());

    const bodyRows = [...table.querySelectorAll("tbody > tr")];
    bodyRows.forEach((row) => {
      const thCell = row.querySelector("th");
      if (!thCell) return;
      const num = parseInt(thCell.textContent.trim(), 10);
      const period = PERIODS.find((p) => p.n === num);
      if (!period) return;

      thCell.innerHTML = `<span class="smcu-period-num">${period.n}</span><span class="smcu-period-time">${period.start}\u2013${period.end}</span>`;
      row.dataset.smcuStart = timeToMinutes(period.start);
      row.dataset.smcuEnd = timeToMinutes(period.end);
      row.classList.add("smcu-period-row");

      [...row.children].forEach((cell, idx) => {
        cell.classList.toggle("smcu-today-cell", idx === todayColIndex);
        const lesson = cell.querySelector(".lesson-cell");
        if (lesson && !lesson.dataset.smcuColored) {
          const subjEl = lesson.querySelector(".timetable-left");
          const hex = colorForSubject(subjEl ? subjEl.textContent.trim() : "");
          const [r, g, b] = hexToRgb(hex);
          lesson.style.setProperty("--smcu-subject-color", hex);
          lesson.style.setProperty("--smcu-subject-bg", `rgba(${r},${g},${b},0.14)`);
          lesson.dataset.smcuColored = "1";
        }
      });
    });

    for (let i = 0; i < PERIODS.length - 1; i++) {
      const curr = PERIODS[i];
      const next = PERIODS[i + 1];
      const gap = timeToMinutes(next.start) - timeToMinutes(curr.end);
      if (gap <= 0) continue;
      const currRow = bodyRows.find((r) => {
        const th = r.querySelector("th");
        return th && parseInt(th.textContent.trim(), 10) === curr.n;
      });
      if (!currRow) continue;

      const breakRow = document.createElement("tr");
      breakRow.className = "smcu-break-row";
      breakRow.dataset.smcuStart = timeToMinutes(curr.end);
      breakRow.dataset.smcuEnd = timeToMinutes(next.start);
      const td = document.createElement("td");
      td.colSpan = totalCols;
      td.innerHTML = `<div class="smcu-break-bar"><span>${gap} min Pause</span></div>`;
      breakRow.appendChild(td);
      currRow.after(breakRow);
    }

    currentTimetableTable = table;
    currentTodayColIndex = todayColIndex;
    updateNowLine();
  }

  function icsEscape(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/([;,])/g, "\\$1")
      .replace(/\r?\n/g, "\\n");
  }

  function formatIcsDate(date, time) {
    const [hours, minutes] = time.split(":").map(Number);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(hours)}${pad(minutes)}00`;
  }

  function parseTimetableDate(header) {
    const match = header.textContent.match(/(\d{1,2})\.(\d{1,2})\.\s*(\d{4})?/);
    if (!match) return null;
    const year = Number(match[3]) || new Date().getFullYear();
    return new Date(year, Number(match[2]) - 1, Number(match[1]));
  }

  function createTimetableIcs() {
    const table = document.querySelector("table.calendar-table");
    if (!table) return null;

    const dates = [...table.querySelectorAll("thead th")].slice(1).map(parseTimetableDate);
    const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const events = [];

    table.querySelectorAll("tbody tr.smcu-period-row").forEach((row) => {
      const periodNumber = parseInt(row.querySelector("th")?.textContent.trim(), 10);
      const period = PERIODS.find((item) => item.n === periodNumber);
      if (!period) return;

      [...row.querySelectorAll("td")].forEach((cell, dayIndex) => {
        const lesson = cell.querySelector(".lesson-cell");
        const date = dates[dayIndex];
        if (!lesson || !date || lesson.classList.contains("cancelled")) return;

        const subject = lesson.querySelector(".timetable-left")?.textContent.trim() || "Unterricht";
        const teacher = lesson.querySelector(".timetable-right")?.textContent.trim();
        const room = lesson.querySelector(".timetable-bottom")?.textContent.trim();
        const description = [teacher && `Lehrkraft: ${teacher}`, room && `Raum: ${room}`]
          .filter(Boolean)
          .join("\n");
        const uid = `${date.getTime()}-${period.n}-${dayIndex}-${Math.random().toString(36).slice(2)}@schulmanager-enhanced`;

        events.push([
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${formatIcsDate(new Date(), "00:00")}`,
          `DTSTART:${formatIcsDate(date, period.start)}`,
          `DTEND:${formatIcsDate(date, period.end)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${dayNames[date.getDay()]}`,
          `SUMMARY:${icsEscape(subject)}`,
          `DESCRIPTION:${icsEscape(description)}`,
          `LOCATION:${icsEscape(room)}`,
          `X-SMCU-PERIOD:${period.n}`,
          "END:VEVENT",
        ].join("\r\n"));
      });
    });

    if (!events.length) return null;
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Schulmanager Enhanced//Timetable//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Schulmanager Stundenplan",
      ...events,
      "END:VCALENDAR",
      "",
    ].join("\r\n");
  }

  function downloadTimetableIcs() {
    const ics = createTimetableIcs();
    if (!ics) {
      alert("Im aktuellen Stundenplan wurden keine exportierbaren Unterrichtsstunden gefunden.");
      return;
    }
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "schulmanager-stundenplan.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function addTimetableExportButton(wrap) {
    if (wrap.querySelector(".smcu-timetable-export")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "smcu-timetable-export";
    button.title = "Stundenplan als Kalenderdatei exportieren";
    button.innerHTML = '<span aria-hidden="true">&#128197;</span> Kalender exportieren';
    button.addEventListener("click", downloadTimetableIcs);
    wrap.insertBefore(button, wrap.firstChild);
  }

  let nowLineEl = null;
  function updateNowLine() {
    const table = currentTimetableTable;
    if (!table || !document.body.contains(table)) return;
    const wrap = table.closest(".smcu-timetable-wrap");
    if (!wrap) return;

    if (!nowLineEl || !wrap.contains(nowLineEl)) {
      nowLineEl = document.createElement("div");
      nowLineEl.className = "smcu-now-line";
      nowLineEl.innerHTML = '<span class="smcu-now-dot"></span><span class="smcu-now-label"></span>';
      wrap.appendChild(nowLineEl);
    }

    if (currentTodayColIndex === -1) {
      nowLineEl.style.display = "none";
      return;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const rows = [...table.querySelectorAll("tbody > tr")].filter((r) => r.dataset.smcuStart !== undefined);
    const activeRow = rows.find(
      (r) => nowMinutes >= Number(r.dataset.smcuStart) && nowMinutes < Number(r.dataset.smcuEnd)
    );

    if (!activeRow) {
      nowLineEl.style.display = "none";
      return;
    }
    const cell = activeRow.children[currentTodayColIndex];
    if (!cell) {
      nowLineEl.style.display = "none";
      return;
    }

    const fraction =
      (nowMinutes - Number(activeRow.dataset.smcuStart)) /
      (Number(activeRow.dataset.smcuEnd) - Number(activeRow.dataset.smcuStart));

    const wrapRect = wrap.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const rowRect = activeRow.getBoundingClientRect();

    nowLineEl.style.display = "flex";
    nowLineEl.style.top = `${rowRect.top - wrapRect.top + fraction * rowRect.height}px`;
    nowLineEl.style.left = `${cellRect.left - wrapRect.left}px`;
    nowLineEl.style.width = `${cellRect.width}px`;
    nowLineEl.querySelector(".smcu-now-label").textContent = now.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function enhanceTimetableIfPresent() {
    if (document.querySelector("table.calendar-table")) enhanceTimetable();
    else currentTimetableTable = null;
  }

  let restoringPastWeek = false;

  function getTimetableWeekSignature() {
    const table = document.querySelector("table.calendar-table");
    if (!table) return "";
    return [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim()).join("|");
  }

  function waitForTimetableWeekChange(previousSignature, timeoutMs) {
    return new Promise((resolve) => {
      const changed = () => {
        const signature = getTimetableWeekSignature();
        if (signature && signature !== previousSignature) {
          observer.disconnect();
          clearTimeout(timeout);
          resolve(signature);
        }
      };
      const observer = new MutationObserver(changed);
      const timeout = setTimeout(() => {
        observer.disconnect();
        resolve("");
      }, timeoutMs || 3000);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      changed();
    });
  }

  function cleanRecurringLessonMarkup(markup) {
    const holder = document.createElement("div");
    holder.innerHTML = markup;
    holder.querySelectorAll(".lesson-cell").forEach((lesson) => {
      lesson.classList.remove("cancelled", "substituted", "substitution", "changed");
      lesson.removeAttribute("data-smcu-colored");
      lesson.style.removeProperty("text-decoration");
    });
    return holder.innerHTML;
  }

  async function restorePastWeekDays() {
    if (restoringPastWeek || currentTodayColIndex <= 1) return;
    const currentTable = document.querySelector("table.calendar-table");
    const previousSignature = getTimetableWeekSignature();
    if (!currentTable || !previousSignature) return;
    const pastDayCount = currentTodayColIndex - 1;

    const nextButton = document.querySelector(".week-navigation .calendar-week-column-flex > div:last-child button");
    if (!nextButton) return;

    restoringPastWeek = true;
    try {
      nextButton.click();
      if (!await waitForTimetableWeekChange(previousSignature)) return;

      enhanceTimetableIfPresent();
      const nextTable = document.querySelector("table.calendar-table");
      const recurringRows = new Map(
        [...(nextTable ? nextTable.querySelectorAll("tbody tr.smcu-period-row") : [])].map((row) => [
          row.querySelector("th")?.textContent.trim().split(/\s+/)[0],
          [...row.querySelectorAll("td")].map((cell) => cleanRecurringLessonMarkup(cell.innerHTML)),
        ])
      );

      const previousButton = document.querySelector(".week-navigation .calendar-week-column-flex > div:first-child button");
      if (!previousButton) return;
      previousButton.click();
      if (!await waitForTimetableWeekChange(getTimetableWeekSignature())) return;

      const restoredTable = document.querySelector("table.calendar-table");
      const restoredPeriods = [...(restoredTable ? restoredTable.querySelectorAll("tbody tr.smcu-period-row") : [])];
      restoredPeriods.forEach((row) => {
        const periodNumber = row.querySelector("th")?.textContent.trim().split(/\s+/)[0];
        const recurringCells = recurringRows.get(periodNumber);
        if (!recurringCells) return;
        [...row.querySelectorAll("td")].forEach((cell, index) => {
          if (index >= pastDayCount || recurringCells[index] === undefined) return;
          cell.innerHTML = recurringCells[index];
          cell.dataset.smcuWeekRestored = "1";
        });
      });
      enhanceTimetable();
    } finally {
      restoringPastWeek = false;
    }
  }

  /* =========================================================
     Berichte-Modul: Abwesenheit -> Anwesenheit umrechnen
     (0% Abwesenheit = 100% Anwesenheit, statt umgekehrt zu zählen)
     ========================================================= */
  const processedAttendanceNodes = new WeakSet();

  function invertAttendanceStats() {
    const tiles = document.querySelectorAll(".tile");
    tiles.forEach((tile) => {
      const header = tile.querySelector(":scope > .tile-header");
      if (!header || !header.textContent.includes("Abwesenheit")) return;

      if (header.children.length === 0 && !header.dataset.smcuRelabeled) {
        header.textContent = header.textContent.replace(/Abwesenheit/g, "Anwesenheit");
        header.dataset.smcuRelabeled = "1";
      }

      const body = tile.querySelector(":scope > .tile-body");
      if (!body) return;

      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let n;
      while ((n = walker.nextNode())) nodes.push(n);

      nodes.forEach((node) => {
        if (processedAttendanceNodes.has(node)) return;
        let text = node.textContent;
        let changed = false;

        text = text.replace(/(\d+)(?:,(\d+))?\s?%/g, (match, intPart, decPart) => {
          changed = true;
          const decimals = decPart ? decPart.length : 0;
          const value = parseFloat(decPart ? `${intPart}.${decPart}` : intPart);
          const inverted = Math.max(0, 100 - value);
          return `${inverted.toFixed(decimals).replace(".", ",")} %`;
        });

        text = text.replace(/\(([\d.,]+)\s*\/\s*([\d.,]+)\s*Std\.\)/g, (match, presentStr, totalStr) => {
          changed = true;
          const decimals = (presentStr.split(",")[1] || "").length;
          const absentVal = parseFloat(presentStr.replace(",", "."));
          const totalVal = parseFloat(totalStr.replace(",", "."));
          const presentVal = Math.max(0, totalVal - absentVal);
          return `(${presentVal.toFixed(decimals).replace(".", ",")} / ${totalStr} Std.)`;
        });

        if (changed) node.textContent = text;
        processedAttendanceNodes.add(node);
      });
    });
  }

  /* =========================================================
     Beobachtung von Angular-Re-Renders
     ========================================================= */
  let enhanceDebounce;
  function scheduleEnhance() {
    clearTimeout(enhanceDebounce);
    enhanceDebounce = setTimeout(() => {
      enhanceTimetableIfPresent();
      invertAttendanceStats();
    }, 150);
  }

  /* =========================================================
     Initialisierung
     ========================================================= */
  (async function init() {
    await waitForSelector(".sm-navbar", 3000);
    await applyLandingRedirectOnce();

    document.documentElement.classList.add("smcu-fixed-sidebar");

    buildSidebarSkeleton();
    buildSettingsModal();
    await initSettingsValues();

    // Sofort aus dem Cache rendern (kein Warten -> keine leere Sidebar beim Start),
    // danach im Hintergrund einmalig neu einlesen, damit neue/entfernte Module
    // bei jedem Login automatisch aktuell sind.
    await renderSidebarModules();
    renderSidebarExtras();
    await populateLandingSelect();
    enhanceTimetableIfPresent();
    restorePastWeekDays();
    refreshModuleList().then(async () => {
      await renderSidebarModules();
      renderSidebarExtras();
      await populateLandingSelect();
    });

    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleEnhance();

    setInterval(() => {
      if (document.querySelector("table.calendar-table")) updateNowLine();
    }, 20000);
    window.addEventListener("resize", () => updateNowLine());

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[THEME_KEY]) {
        applyTheme(changes[THEME_KEY].newValue);
        highlightActiveTheme(changes[THEME_KEY].newValue);
      }
      if (changes[ACCENT_KEY]) {
        applyAccent(changes[ACCENT_KEY].newValue);
        const ai = document.getElementById("smcu-accent-input");
        if (ai) ai.value = changes[ACCENT_KEY].newValue || getComputedAccent();
      }
      if (changes[CUSTOM_CSS_KEY]) {
        applyCustomCss(changes[CUSTOM_CSS_KEY].newValue);
        const ci = document.getElementById("smcu-custom-css-input");
        if (ci) ci.value = changes[CUSTOM_CSS_KEY].newValue || "";
      }
    });
  })();
})();
