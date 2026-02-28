/**
 * Match result component
 * Displays the product match score with visual gauge, matched DNA item, and
 * an "Add to Style DNA" button for the feedback loop.
 */

import { useState } from "react";
import { useStore } from "~store";
import { addToDna } from "~api";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Dna,
  Plus,
  Check
} from "lucide-react";

export function MatchResult() {
  const {
    matchResult,
    currentProduct,
    userProfile,
    dnaAddSuccess,
    setAppState,
    setMatchResult,
    setDnaAddSuccess,
    addFavoriteItem,
    setError
  } = useStore();

  const [addingDna, setAddingDna] = useState(false);
  const [dnaAddMessage, setDnaAddMessage] = useState('');

  if (!matchResult) {
    return null;
  }

  const handleBack = () => {
    setMatchResult(null);
    setDnaAddSuccess(false);
    setAppState('onboarded');
  };

  const handleAddToDna = async () => {
    if (!userProfile?.userId || !currentProduct) return;

    try {
      setAddingDna(true);
      const itemText = `${currentProduct.title}. ${currentProduct.description}`;
      const res = await addToDna(userProfile.userId, itemText);
      if (res.message.toLowerCase().includes('already exists')) {
        setDnaAddMessage(res.message);
      } else {
        addFavoriteItem(currentProduct.title);
        setDnaAddMessage(res.message);
      }
      setDnaAddSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to Style DNA');
    } finally {
      setAddingDna(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 55) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-green-100';
    if (percentage >= 70) return 'bg-blue-100';
    if (percentage >= 55) return 'bg-yellow-100';
    if (percentage >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 85) return <CheckCircle2 className="w-6 h-6" />;
    if (percentage >= 70) return <TrendingUp className="w-6 h-6" />;
    if (percentage >= 55) return <Minus className="w-6 h-6" />;
    return <TrendingDown className="w-6 h-6" />;
  };

  const getRecommendation = (percentage: number) => {
    if (percentage >= 85) {
      return {
        title: "Highly Recommended",
        message: "This product aligns perfectly with your style preferences.",
        action: "This is a great match for you!"
      };
    }
    if (percentage >= 70) {
      return {
        title: "Good Match",
        message: "This product fits well with your taste profile.",
        action: "Worth considering for your collection."
      };
    }
    if (percentage >= 55) {
      return {
        title: "Moderate Match",
        message: "This product has some alignment with your preferences.",
        action: "Could work if you're looking for variety."
      };
    }
    if (percentage >= 40) {
      return {
        title: "Low Match",
        message: "This product diverges from your usual style.",
        action: "Consider if you're exploring new styles."
      };
    }
    return {
      title: "Poor Match",
      message: "This product doesn't align with your taste profile.",
      action: "Probably not the best fit for you."
    };
  };

  const recommendation = getRecommendation(matchResult.percentage);

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Analyze Another Product
      </button>

      {/* Product Info */}
      {currentProduct && (
        <div className="card bg-gray-50 space-y-1">
          <p className="text-xs font-medium text-gray-500">Analyzed Product</p>
          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
            {currentProduct.title}
          </p>
        </div>
      )}

      {/* Match Score Gauge */}
      <div className="card space-y-4">
        <div className="text-center space-y-3">
          <div className={`w-24 h-24 mx-auto rounded-full ${getScoreBgColor(matchResult.percentage)} flex items-center justify-center`}>
            <div className={getScoreColor(matchResult.percentage)}>
              {getScoreIcon(matchResult.percentage)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-bold text-gray-900">
              {Math.round(matchResult.percentage)}%
            </div>
            <div className={`text-lg font-semibold ${getScoreColor(matchResult.percentage)}`}>
              {matchResult.label}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                matchResult.percentage >= 85 ? 'bg-green-600' :
                matchResult.percentage >= 70 ? 'bg-blue-600' :
                matchResult.percentage >= 55 ? 'bg-yellow-600' :
                matchResult.percentage >= 40 ? 'bg-orange-600' :
                'bg-red-600'
              }`}
              style={{ width: `${matchResult.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Best Style DNA Match */}
      {matchResult.matchedItem && (
        <div className="card bg-purple-50 border-purple-200 space-y-2">
          <div className="flex items-center gap-2">
            <Dna className="w-4 h-4 text-purple-600" />
            <p className="text-xs font-medium text-purple-900">Best Style DNA Match</p>
          </div>
          <p className="text-sm text-purple-700 line-clamp-2">
            {matchResult.matchedItem}
          </p>
        </div>
      )}

      {/* Recommendation Card */}
      <div className={`card ${getScoreBgColor(matchResult.percentage)} border-2`}>
        <div className="space-y-2">
          <h3 className={`text-sm font-bold ${getScoreColor(matchResult.percentage)}`}>
            {recommendation.title}
          </h3>
          <p className="text-sm text-gray-700">
            {recommendation.message}
          </p>
          <p className="text-xs font-medium text-gray-600 pt-2 border-t border-gray-200">
            {recommendation.action}
          </p>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="card bg-blue-50 border-blue-200 space-y-2">
        <p className="text-xs font-medium text-blue-900">AI Analysis</p>
        <p className="text-sm text-blue-700">
          {matchResult.reasoning}
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="card space-y-3">
        <p className="text-xs font-medium text-gray-600">Match Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Raw Score</p>
            <p className="text-lg font-bold text-gray-900">
              {matchResult.matchScore.toFixed(3)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Confidence</p>
            <p className="text-lg font-bold text-gray-900">
              {matchResult.percentage >= 70 ? 'High' : matchResult.percentage >= 40 ? 'Medium' : 'Low'}
            </p>
          </div>
        </div>
      </div>

      {/* Add to Style DNA */}
      {currentProduct && !dnaAddSuccess && (
        <button
          onClick={handleAddToDna}
          disabled={addingDna}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {addingDna ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add to My Style DNA
            </>
          )}
        </button>
      )}

      {/* DNA Add Success */}
      {dnaAddSuccess && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              {dnaAddMessage || 'Added to your Style DNA!'}
            </p>
          </div>
          {!dnaAddMessage?.toLowerCase().includes('already exists') && (
            <p className="text-xs text-green-600 mt-1">
              Future analyses will use this product as a reference point.
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleBack}
        className="btn-primary w-full"
      >
        Analyze Another Product
      </button>
    </div>
  );
}
