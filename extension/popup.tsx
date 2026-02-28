/**
 * Popup fallback for SpecScout
 * Prompts user to open the side panel for the full experience
 */

import { Sparkles } from "lucide-react"
import "~style.css"

function Popup() {
  const openSidePanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId })
        window.close()
      }
    } catch {
      // Side panel API not available — keep popup open
    }
  }

  return (
    <div className="w-72 p-4 space-y-4 bg-white">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">SpecScout</h1>
          <p className="text-xs text-gray-500">AI Shopping Assistant</p>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Open the side panel for the full experience — product analysis, style matching, and more.
      </p>

      <button onClick={openSidePanel} className="btn-primary w-full text-sm">
        Open Side Panel
      </button>
    </div>
  )
}

export default Popup
