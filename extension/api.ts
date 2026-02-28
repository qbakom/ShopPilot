/**
 * API service for communicating with SpecScout backend
 * Handles onboarding, product analysis, and DNA management
 */

import type {
  OnboardResponse,
  AnalyzeResponse,
  DnaAddResponse,
  DnaDeleteResponse,
  DnaResetResponse,
  UserProfileResponse,
} from './types';

// Backend API URL - configure based on environment
const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:8000';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Network error occurred',
      undefined,
      error
    );
  }
}

/**
 * Onboard a new user with 1-5 favorite items
 */
export async function onboardUser(favoriteItems: string[]): Promise<OnboardResponse> {
  if (favoriteItems.length < 1 || favoriteItems.length > 5) {
    throw new Error('Between 1 and 5 favorite items are required');
  }

  return fetchAPI<OnboardResponse>('/onboard', {
    method: 'POST',
    body: JSON.stringify({ favorite_items: favoriteItems }),
  });
}

/**
 * Analyze a product against user preferences
 */
export async function analyzeProduct(
  userId: string,
  productTitle: string,
  productDescription: string
): Promise<AnalyzeResponse> {
  if (!userId) throw new Error('User ID is required');
  if (!productTitle || !productDescription) throw new Error('Product title and description are required');

  return fetchAPI<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      product_title: productTitle,
      product_description: productDescription,
    }),
  });
}

/**
 * Add a new item to the user's Style DNA
 */
export async function addToDna(
  userId: string,
  itemText: string
): Promise<DnaAddResponse> {
  if (!userId) throw new Error('User ID is required');

  return fetchAPI<DnaAddResponse>('/dna/add', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, item_text: itemText }),
  });
}

/**
 * Delete a single DNA item by id
 */
export async function deleteDnaItem(
  userId: string,
  dnaId: number
): Promise<DnaDeleteResponse> {
  if (!userId) throw new Error('User ID is required');

  return fetchAPI<DnaDeleteResponse>(`/dna/${dnaId}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

/**
 * Reset (delete) all DNA items for a user
 */
export async function resetDna(userId: string): Promise<DnaResetResponse> {
  if (!userId) throw new Error('User ID is required');

  return fetchAPI<DnaResetResponse>('/dna/reset', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

/**
 * Get user profile with structured DNA items
 */
export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  if (!userId) throw new Error('User ID is required');

  return fetchAPI<UserProfileResponse>(`/users/${encodeURIComponent(userId)}`);
}

/**
 * Health check to verify backend is running
 */
export async function checkHealth(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>('/health');
}
