/**
 * Type definitions for SpecScout extension
 */

export interface DnaItem {
  id: number;
  text: string;
}

export interface UserProfile {
  userId: string;
  favoriteItems: string[];
  calibrated: boolean;
  dnaItems?: DnaItem[];
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
  matchedItem: string;
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
  matched_item: string;
}

export interface DnaAddResponse {
  message: string;
  dna_count: number;
}

export interface DnaDeleteResponse {
  message: string;
  dna_count: number;
}

export interface DnaResetResponse {
  message: string;
  deleted_count: number;
}

export interface UserProfileResponse {
  user_id: string;
  dna_items: DnaItem[];
  dna_count: number;
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

  // DNA feedback loop
  dnaAddSuccess: boolean;

  // UI state
  loading: boolean;
  error: string | null;

  // Actions
  setUserProfile: (profile: UserProfile) => void;
  setAppState: (state: AppState) => void;
  setCurrentProduct: (product: ProductData | null) => void;
  setMatchResult: (result: MatchResult | null) => void;
  setDnaAddSuccess: (success: boolean) => void;
  addFavoriteItem: (item: string) => void;
  removeFavoriteItem: (id: number) => void;
  setDnaItems: (items: DnaItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
