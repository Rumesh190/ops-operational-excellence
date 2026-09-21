import { DEFAULT_UI_PREFERENCES, UI_PREFERENCES_STORAGE_KEY } from "@/lib/ui-preferences"

const initScript = `
(function () {
  try {
    var defaults = ${JSON.stringify(DEFAULT_UI_PREFERENCES)};
    var stored = JSON.parse(localStorage.getItem(${JSON.stringify(UI_PREFERENCES_STORAGE_KEY)}) || "null") || {};
    var navigation = "left";
    var sidebar = stored.sidebarCollapsed === true ? "collapsed" : "expanded";
    var accents = ["indigo", "blue", "teal", "emerald", "orange", "rose"];
    var accent = accents.indexOf(stored.accentColor) >= 0 ? stored.accentColor : defaults.accentColor;
    var languages = ["en", "hi", "ta", "bn", "ja"];
    var language = languages.indexOf(stored.language) >= 0 ? stored.language : defaults.language;
    document.documentElement.dataset.navigation = navigation;
    document.documentElement.dataset.sidebar = sidebar;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language;
  } catch (_) {
    document.documentElement.dataset.navigation = "left";
    document.documentElement.dataset.sidebar = "expanded";
    document.documentElement.dataset.accent = "indigo";
    document.documentElement.dataset.language = "en";
    document.documentElement.lang = "en";
  }
})();`

function PreferencesInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: initScript }} />
}

export { PreferencesInitScript }
