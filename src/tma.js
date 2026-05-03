let postEvent = () => {}
let themeParams = {}
let initDataRaw = ''

try {
  const sdk = await import('@tma.js/sdk')
  const { init, retrieveLaunchParams } = sdk

  // This will only succeed inside Telegram
  const launchParams = retrieveLaunchParams()
  initDataRaw = launchParams.initDataRaw
  themeParams = launchParams.themeParams
  postEvent = sdk.postEvent
  init()
} catch (e) {
  // Not inside Telegram – we're in a browser during development.
  // Silently provide dummy values so the app still renders.
  themeParams = {
    bg_color: '#1a1a2e',
    text_color: '#e0e0e0',
    hint_color: '#8888aa',
    link_color: '#00d4ff',
    button_color: '#3742fa'
  }
  console.log('Running outside Telegram – using mock theme.')
}

export { postEvent, themeParams, initDataRaw }