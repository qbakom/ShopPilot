/**
 * Zustand store for SpecScout extension state management
 * Uses chrome.storage.local for persistence across extension lifecycle
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  StoreState,
  UserProfile,
  ProductData,
  MatchResult,
  AppState,
  DnaItem
} from "./types"

/**
 * Chrome storage adapter for Zustand persist middleware.
 * Unlike localStorage, chrome.storage.local persists reliably
 * across extension restarts and service worker terminations.
 */
const chromeStorage = createJSONStorage<StoreState>(() => ({
  getItem: async (name: string) => {
    const result = await chrome.storage.local.get(name)
    return result[name] ?? null
  },
  setItem: async (name: string, value: string) => {
    await chrome.storage.local.set({ [name]: value })
  },
  removeItem: async (name: string) => {
    await chrome.storage.local.remove(name)
  }
}))

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Initial state
      userProfile: null,
      appState: "empty" as AppState,
      currentProduct: null,
      matchResult: null,
      dnaAddSuccess: false,
      loading: false,
      error: null,

      // Actions
      setUserProfile: (profile: UserProfile) => {
        set({
          userProfile: profile,
          appState: profile.calibrated ? "onboarded" : "empty"
        })
      },

      setAppState: (appState: AppState) => {
        set({ appState })
      },

      setCurrentProduct: (product: ProductData | null) => {
        set({ currentProduct: product })
      },

      setMatchResult: (result: MatchResult | null) => {
        set({
          matchResult: result,
          appState: result ? "result" : "onboarded"
        })
      },

      setDnaAddSuccess: (dnaAddSuccess: boolean) => {
        set({ dnaAddSuccess })
      },

      addFavoriteItem: (item: string) => {
        set((state) => {
          if (!state.userProfile) return state
          return {
            userProfile: {
              ...state.userProfile,
              favoriteItems: [...state.userProfile.favoriteItems, item]
            }
          }
        })
      },

      removeFavoriteItem: (id: number) => {
        set((state) => {
          if (!state.userProfile) return state
          const dnaItems = (state.userProfile.dnaItems ?? []).filter((d) => d.id !== id)
          return {
            userProfile: {
              ...state.userProfile,
              dnaItems,
              favoriteItems: dnaItems.map((d) => d.text)
            }
          }
        })
      },

      setDnaItems: (items: DnaItem[]) => {
        set((state) => {
          if (!state.userProfile) return state
          return {
            userProfile: {
              ...state.userProfile,
              dnaItems: items,
              favoriteItems: items.map((d) => d.text)
            }
          }
        })
      },

      setLoading: (loading: boolean) => {
        set({ loading })
      },

      setError: (error: string | null) => {
        set({ error, loading: false })
      },

      reset: () => {
        set({
          userProfile: null,
          appState: "empty",
          currentProduct: null,
          matchResult: null,
          dnaAddSuccess: false,
          loading: false,
          error: null
        })
      }
    }),
    {
      name: "specscout-storage",
      storage: chromeStorage,
      partialize: (state) => ({
        userProfile: state.userProfile
      }) as StoreState
    }
  )
)
