// Apply the saved appearance before the app renders to prevent a theme flash.
(function () {
  var preference = "system";
  try {
    var saved = localStorage.getItem("media-extensions-theme");
    if (saved === "light" || saved === "dark") preference = saved;
  } catch {}
  var theme = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#101112" : "#f6f5f1");
})();
