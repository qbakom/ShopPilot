/**
 * Background service worker for SpecScout
 * Registers the side panel and handles extension lifecycle events.
 * Relays messages between content scripts and the side panel.
 */

// Open side panel when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: Error) => console.error("Failed to set panel behavior:", error))

// Set side panel options on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: "sidepanel.html",
    enabled: true
  })
})

// Relay messages from content scripts to the side panel
// Content scripts can't talk directly to the side panel, so we forward picker events.
chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  if (message.action === 'productPicked' || message.action === 'pickerCancelled') {
    // Forward to all extension pages (side panel will pick it up)
    chrome.runtime.sendMessage(message).catch(() => {
      // Side panel might not be open — ignore
    })
  }
})

export {}
