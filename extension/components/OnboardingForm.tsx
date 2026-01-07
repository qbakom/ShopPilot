/**
 * Onboarding form component
 * Collects 3 favorite items from user to calibrate their taste profile
 */

import { useState } from "react";
import { useStore } from "~store";
import { onboardUser } from "~api";
import { ShoppingBag, Sparkles } from "lucide-react";

export function OnboardingForm() {
  const { setUserProfile, setLoading, setError, loading, error } = useStore();
  const [items, setItems] = useState(['', '', '']);

  const handleInputChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields filled
    const validItems = items.filter(item => item.trim().length > 0);
    if (validItems.length !== 3) {
      setError('Please describe all 3 favorite items');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await onboardUser(items);

      setUserProfile({
        userId: response.user_id,
        favoriteItems: response.favorite_items,
        calibrated: response.calibrated
      });

      // Success - state will automatically transition to 'onboarded'
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Card */}
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Welcome to SpecScout</h2>
            <p className="text-sm text-gray-600">Let's calibrate your taste</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900">How it works</p>
            <p className="text-xs text-blue-700">
              Describe 3 items you absolutely love. Be specific about style, material,
              color, or features. This helps us understand your taste.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Favorite Item #{index + 1}
              </label>
              <textarea
                value={items[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder={`e.g., Black minimalist gore-tex jacket with hidden pockets`}
                className="input-field resize-none"
                rows={2}
                disabled={loading}
                required
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || items.some(item => !item.trim())}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Profile...
            </span>
          ) : (
            'Calibrate My Taste'
          )}
        </button>
      </form>

      {/* Example */}
      <div className="card bg-gray-50 space-y-2">
        <p className="text-xs font-medium text-gray-700">Example:</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Merino wool crew neck sweater in charcoal grey</li>
          <li>• Japanese selvedge denim with subtle fading</li>
          <li>• Minimalist leather sneakers in all white</li>
        </ul>
      </div>
    </div>
  );
}
