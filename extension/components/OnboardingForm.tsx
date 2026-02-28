/**
 * Onboarding form component
 * Collects 1-5 favorite items from user to calibrate their taste profile
 */

import { useState } from "react";
import { useStore } from "~store";
import { onboardUser } from "~api";
import { ShoppingBag, Sparkles, Plus, Trash2 } from "lucide-react";

const MAX_ITEMS = 5;

export function OnboardingForm() {
  const { setUserProfile, setLoading, setError, loading, error } = useStore();
  const [items, setItems] = useState<string[]>(['']);

  const handleInputChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const addField = () => {
    if (items.length < MAX_ITEMS) {
      setItems([...items, '']);
    }
  };

  const removeField = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.map(i => i.trim()).filter(i => i.length > 0);
    if (validItems.length < 1) {
      setError('Please describe at least 1 favorite item');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await onboardUser(validItems);

      setUserProfile({
        userId: response.user_id,
        favoriteItems: response.favorite_items,
        calibrated: response.calibrated
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filledCount = items.filter(i => i.trim().length > 0).length;

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
              Describe 1-5 items you absolutely love. Be specific about style, material,
              color, or features. This helps us understand your taste.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Favorite Item #{index + 1}
                </label>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                value={item}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder="e.g., Black minimalist gore-tex jacket with hidden pockets"
                className="input-field resize-none"
                rows={2}
                disabled={loading}
              />
            </div>
          ))}
        </div>

        {/* Add item button */}
        {items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={addField}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add another item ({items.length}/{MAX_ITEMS})
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || filledCount < 1}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Profile...
            </span>
          ) : (
            `Calibrate My Taste (${filledCount} item${filledCount !== 1 ? 's' : ''})`
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
