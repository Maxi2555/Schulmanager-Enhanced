const THEME_KEY = "smcuTheme";
const ACCENT_KEY = "smcuAccent";
const CUSTOM_CSS_KEY = "smcuCustomCss";
const LANDING_KEY = "smcuLandingPage";
const MODULE_CACHE_KEY = "smcuModuleCache";
const TIMETABLE_CACHE_KEY = "smcuTimetableCache";
const TIMETABLE_PERIOD_COUNT = 11;
const TIMETABLE_DAY_COUNT = 5;

const THEMES = [
  ["light", "Hell", "#f7f8f6"], ["dark", "Dunkel", "#1a1c20"],
  ["nitro-purple", "Purple", "linear-gradient(135deg,#5865F2,#EB459E)"],
  ["nitro-aurora", "Aurora", "linear-gradient(135deg,#00c6ff,#7b2ff7)"],
  ["nitro-sunset", "Sunset", "linear-gradient(135deg,#ff512f,#dd2476)"],
  ["nitro-emerald", "Emerald", "linear-gradient(135deg,#11998e,#38ef7d)"],
  ["nitro-cherry", "Cherry", "linear-gradient(135deg,#eb3349,#f45c43)"],
  ["nitro-cyber", "Cyber", "linear-gradient(135deg,#4facfe,#00f2fe)"],
  ["nitro-gold", "Gold", "linear-gradient(135deg,#f7971e,#ffd200)"],
  ["nitro-ocean", "Ocean", "linear-gradient(135deg,#2193b0,#6dd5ed)"],
  ["nitro-galaxy", "Galaxy", "linear-gradient(135deg,#0f0c29,#7b2ff7)"],
  ["nitro-lava", "Lava", "linear-gradient(135deg,#ff4500,#8b0000)"],
  ["nitro-candy", "Candy", "linear-gradient(135deg,#ff6a88,#ff99ac)"],
  ["nitro-neon", "Neon", "linear-gradient(135deg,#00f260,#0575e6)"],
  ["nitro-royale", "Royale", "linear-gradient(135deg,#141e30,#764ba2)"],
];
const THEME_ACCENTS = {
  light: "#2f6f4e", dark: "#3fae76", "nitro-purple": "#5865F2", "nitro-aurora": "#0072ff",
  "nitro-sunset": "#ff512f", "nitro-emerald": "#11998e", "nitro-cherry": "#eb3349",
  "nitro-cyber": "#4facfe", "nitro-gold": "#f7971e", "nitro-ocean": "#2193b0",
  "nitro-galaxy": "#7b2ff7", "nitro-lava": "#ff4500", "nitro-candy": "#ff6a88",
  "nitro-neon": "#00f260", "nitro-royale": "#764ba2",
};

const $ = (selector) => document.querySelector(selector);
const getStored = async (key, fallback) => {
  const result = await browser.storage.local.get(key);
  return key in result ? result[key] : fallback;
};
const setStored = (key, value) => browser.storage.local.set({ [key]: value });

function isCycleKey(key, cycle) {
  return new RegExp(`Woche\\s+_?${cycle}\\b`, "i").test(key);
}

function isKnownTimetableEntry(entry) {
  return typeof entry === "string" || Boolean(entry && entry.known);
}

function timetableProgress(cache) {
  let knownSlots = 0;
  ["A", "B"].forEach((cycle) => {
    Object.entries(cache || {}).forEach(([key, periods]) => {
      if (!isCycleKey(key, cycle) || !periods || typeof periods !== "object") return;
      for (let period = 1; period <= TIMETABLE_PERIOD_COUNT; period++) {
        const days = periods[String(period)];
        for (let day = 0; day < TIMETABLE_DAY_COUNT; day++) {
          if (isKnownTimetableEntry(days?.[day])) knownSlots++;
        }
      }
    });
  });
  return Math.min(100, Math.round((knownSlots / (TIMETABLE_PERIOD_COUNT * TIMETABLE_DAY_COUNT * 2)) * 100));
}

async function renderTimetableProgress() {
  const progress = timetableProgress(await getStored(TIMETABLE_CACHE_KEY, {}));
  $("#timetable-progress-text").textContent = `Stundenplan zu ${progress}% Gespeichert`;
  $("#timetable-progress-bar").style.width = `${progress}%`;
}

function renderThemes(currentTheme) {
  const container = $("#theme-options");
  container.innerHTML = "";
  THEMES.forEach(([id, label, preview]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.theme = id;
    button.title = label;
    button.style.setProperty("--theme-preview", preview);
    if (id === "light") button.style.setProperty("--theme-label-color", "#20252b");
    button.classList.toggle("active", id === currentTheme);
    button.innerHTML = `<span>${label}</span>`;
    button.addEventListener("click", async () => {
      await setStored(THEME_KEY, id);
      renderThemes(id);
      $("#theme-label").textContent = label;
    });
    container.appendChild(button);
  });
}

async function init() {
  const theme = await getStored(THEME_KEY, "light");
  const themeData = THEMES.find(([id]) => id === theme) || THEMES[0];
  renderThemes(themeData[0]);
  $("#theme-label").textContent = themeData[1];
  await renderTimetableProgress();

  const accent = await getStored(ACCENT_KEY, "");
  $("#accent-input").value = accent || THEME_ACCENTS[themeData[0]];
  $("#accent-input").addEventListener("input", (event) => setStored(ACCENT_KEY, event.target.value));
  $("#accent-reset").addEventListener("click", async () => {
    await setStored(ACCENT_KEY, "");
    $("#accent-input").value = THEME_ACCENTS[$("#theme-options .active").dataset.theme];
  });

  const modules = await getStored(MODULE_CACHE_KEY, []);
  const landing = $("#landing-select");
  modules.forEach((module) => landing.appendChild(new Option(module.label, module.href)));
  landing.value = await getStored(LANDING_KEY, "");
  landing.addEventListener("change", (event) => setStored(LANDING_KEY, event.target.value));

  $("#custom-css-input").value = await getStored(CUSTOM_CSS_KEY, "");
  let cssTimer;
  $("#custom-css-input").addEventListener("input", (event) => {
    $("#css-status").textContent = "Speichert ...";
    clearTimeout(cssTimer);
    cssTimer = setTimeout(async () => {
      await setStored(CUSTOM_CSS_KEY, event.target.value);
      $("#css-status").textContent = "Automatisch gespeichert";
    }, 400);
  });
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[TIMETABLE_CACHE_KEY]) renderTimetableProgress();
});

init();
