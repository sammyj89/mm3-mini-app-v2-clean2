// tma.js
export let themeParams = {
  bgColor: '#1a1a2e',
  secondaryBgColor: '#16213e',
  textColor: '#e0e0e0',
  hintColor: '#a0a0a0',
  accentTextColor: '#00d4ff',
  buttonColor: '#00d4ff',
  buttonTextColor: '#ffffff',
};

// 🔧 FIX: Safely attempt Telegram SDK initialization
try {
  if (window.Telegram?.WebApp?.initData) {
    // Dynamically import only if inside Telegram
    import('@tma.js/sdk').then((sdk) => {
      const tp = sdk.themeParams();
      if (tp) themeParams = tp;
    }).catch(() => {});
  }
} catch (e) {
  // Not in Telegram, use mock theme
}