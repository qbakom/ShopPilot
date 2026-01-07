/**
 * Type definitions for SpecScout extension
 */

export interface UserProfile {
  userId: string;
  favoriteItems: string[];
  calibrated: boolean;
}

export interface ProductData {
  title: string;
  description: string;
  url?: string;
}

export interface MatchResult {
  matchScore: number;
  percentage: number;
  label: string;
  reasoning: string;
}

export interface OnboardResponse {
  user_id: string;
  message: string;
  calibrated: boolean;
  favorite_items: string[];
}

export interface AnalyzeResponse {
  match_score: number;
  percentage: number;
  label: string;
  reasoning: string;
}

export type AppState =
  | 'empty'        // Not onboarded
  | 'onboarded'    // User has profile
  | 'analyzing'    // Currently analyzing product
  | 'result';      // Showing match result

export interface StoreState {
  // User state
  userProfile: UserProfile | null;
  appState: AppState;

  // Product state
  currentProduct: ProductData | null;
  matchResult: MatchResult | null;

  // UI state
  loading: boolean;
  error: string | null;

  // Actions
  setUserProfile: (profile: UserProfile) => void;
  setAppState: (state: AppState) => void;
  setCurrentProduct: (product: ProductData | null) => void;
  setMatchResult: (result: MatchResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
