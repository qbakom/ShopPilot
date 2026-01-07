/**
 * Product analysis component
 * Allows user to analyze current product page against their taste profile
 */

import { useState, useEffect } from "react";
import { useStore } from "~store";
import { analyzeProduct } from "~api";
import { Search, AlertCircle, RotateCcw, User } from "lucide-react";

export function ProductAnalysis() {
  const {
    userProfile,
    setCurrentProduct,
    setMatchResult,
    setAppState,
    setLoading,
    setError,
    loading,
    error,
    reset
  } = useStore();

  const [productDetected, setProductDetected] = useState(false);
  const [productTitle, setProductTitle] = useState('');

  // Check if we're on a product page
  useEffect(() => {
    checkForProduct();
  }, []);

  const checkForProduct = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        setProductDetected(false);
        return;
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractProduct'
      });

      if (response?.productData) {
        setProductDetected(true);
        setProductTitle(response.productData.title);
        setCurrentProduct(response.productData);
      } else {
        setProductDetected(false);
        setCurrentProduct(null);
      }
    } catch (err) {
      console.error('Error checking for product:', err);
      setProductDetected(false);
    }
  };

  const handleAnalyze = async () => {
    if (!userProfile?.userId) {
      setError('User profile not found. Please re-onboard.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAppState('analyzing');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id!, {
        action: 'extractProduct'
      });

      if (!response?.productData) {
        throw new Error('Could not extract product information');
      }

      const { title, description } = response.productData;

      const result = await analyzeProduct(userProfile.userId, title, description);

      setMatchResult({
        matchScore: result.match_score,
        percentage: result.percentage,
        label: result.label,
        reasoning: result.reasoning
      });

      setAppState('result');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze product';
      setError(errorMessage);
      setAppState('onboarded');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your profile? You will need to re-calibrate.')) {
      reset();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* User Profile Card */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Profile Active</h2>
              <p className="text-xs text-gray-500">Calibrated & ready</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {userProfile?.favoriteItems && (
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <p className="text-xs font-medium text-gray-600">Your Style DNA:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              {userProfile.favoriteItems.map((item, idx) => (
                <li key={idx} className="truncate">• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Product Detection */}
      {productDetected ? (
        <div className="space-y-4">
          <div className="card bg-primary-50 border-primary-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-primary-900">Product Detected</h3>
                <p className="text-xs text-primary-700 line-clamp-2">{productTitle}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </span>
            ) : (
              'Analyze This Product'
            )}
          </button>
        </div>
      ) : (
        <div className="card bg-gray-50 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">No Product Detected</h3>
              <p className="text-xs text-gray-500">
                Navigate to a product page on an e-commerce site to analyze it against your taste profile.
              </p>
              <button
                onClick={checkForProduct}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mt-2"
              >
                <RotateCcw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-blue-50 border-blue-200 space-y-2">
        <p className="text-xs font-medium text-blue-900">How to use:</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Visit any product page (Amazon, etc.)</li>
          <li>Open this panel and click "Analyze"</li>
          <li>Get instant match score based on your style</li>
        </ol>
      </div>
    </div>
  );
}
