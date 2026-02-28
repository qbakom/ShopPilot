/**
 * Background service worker for SpecScout
 * Registers the side panel and handles extension lifecycle events
 */

// Open side panel when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: Error) => console.error("Failed to set panel behavior:", error))

// Set side panel options on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: "sidepanel/index.html",
    enabled: true
  })
})

export {}
