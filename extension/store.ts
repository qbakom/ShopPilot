/**
 * Zustand store for SpecScout extension state management
 * Handles user profile, product data, and UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreState, UserProfile, ProductData, MatchResult, AppState } from './types';

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Initial state
      userProfile: null,
      appState: 'empty',
      currentProduct: null,
      matchResult: null,
      loading: false,
      error: null,

      // Actions
      setUserProfile: (profile: UserProfile) => {
        set({
          userProfile: profile,
          appState: profile.calibrated ? 'onboarded' : 'empty'
        });
      },

      setAppState: (appState: AppState) => {
        set({ appState });
      },

      setCurrentProduct: (product: ProductData | null) => {
        set({ currentProduct: product });
      },

      setMatchResult: (result: MatchResult | null) => {
        set({
          matchResult: result,
          appState: result ? 'result' : 'onboarded'
        });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      setError: (error: string | null) => {
        set({ error, loading: false });
      },

      reset: () => {
        set({
          userProfile: null,
          appState: 'empty',
          currentProduct: null,
          matchResult: null,
          loading: false,
          error: null
        });
      }
    }),
    {
      name: 'specscout-storage', // Name in Chrome storage
      partialize: (state) => ({
        // Only persist user profile
        userProfile: state.userProfile
      })
    }
  )
);
