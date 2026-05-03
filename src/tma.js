// tma.js – safely initialise Telegram SDK (no top‑level await)

let postEvent = () => {}
let themeParams = {}
let initDataRaw = ''

;(async () => {
  try {
    const sdk = await import('@tma.js/sdk')
    const { init, retrieveLaunchParams } = sdk
    const launchParams = retrieveLaunchParams()
    initDataRaw = launchParams.initDataRaw
    themeParams = launchParams.themeParams
    postEvent = sdk.postEvent
    init()
  } catch (_) {
    // Running outside Telegram – provide mock theme for development
    themeParams = {
      accentTextColor: '#00d4ff',
      bgColor: '#1a1a2e',
      buttonColor: '#3742fa',
      buttonTextColor: '#ffffff',
      textColor: '#e0e0e0',
      hintColor: '#8888aa',
      linkColor: '#00d4ff',
      // fill remaining required props with defaults
      bottomBarBgColor: '#1a1a2e',
      headerBgColor: '#1a1a2e',
      destructiveTextColor: '#ff4757',
      secondaryBgColor: '#16213e',
      sectionBgColor: '#16213e',
      sectionHeaderTextColor: '#8888aa',
      subtitleTextColor: '#8888aa',
    }
    console.log('Running outside Telegram – using mock theme.')
  }
})()

export { postEvent, themeParams, initDataRaw }