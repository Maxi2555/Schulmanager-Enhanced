const THEME_KEY = "smcuTheme";

document.querySelectorAll(".quick-themes button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await browser.storage.local.set({ [THEME_KEY]: btn.dataset.theme });
  });
});
