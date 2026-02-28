/**
 * Main Side Panel component for SpecScout
 * Displays different UI states based on user onboarding and product analysis
 */

import { useEffect } from "react";
import { useStore } from "~store";
import { OnboardingForm } from "~components/OnboardingForm";
import { ProductAnalysis } from "~components/ProductAnalysis";
import { MatchResult } from "~components/MatchResult";
import { Sparkles } from "lucide-react";
import "~style.css";

function SidePanel() {
  const { appState, userProfile, setAppState } = useStore();

  // Initialize app state on mount
  useEffect(() => {
    if (userProfile?.calibrated) {
      setAppState('onboarded');
    } else {
      setAppState('empty');
    }
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SpecScout</h1>
            <p className="text-xs text-gray-500">Your AI Shopping Assistant</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {appState === 'empty' && <OnboardingForm />}
        {appState === 'onboarded' && <ProductAnalysis />}
        {appState === 'analyzing' && <LoadingState />}
        {appState === 'result' && <MatchResult />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-3">
        <p className="text-xs text-center text-gray-500">
          Powered by AI matching technology
        </p>
      </footer>
    </div>
  );
}

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium text-gray-900">Analyzing Product</p>
          <p className="text-sm text-gray-500">Matching against your style profile...</p>
        </div>
      </div>
    </div>
  );
}

export default SidePanel;
