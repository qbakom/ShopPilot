/**
 * API service for communicating with SpecScout backend
 * Handles onboarding and product analysis requests
 */

import type { OnboardResponse, AnalyzeResponse } from './types';

// Backend API URL - configure based on environment
const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Custom error class for API errors
 */
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

/**
 * Generic fetch wrapper with error handling
 */
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

    // Network or other errors
    throw new APIError(
      error instanceof Error ? error.message : 'Network error occurred',
      undefined,
      error
    );
  }
}

/**
 * Onboard a new user with their favorite items
 */
export async function onboardUser(favoriteItems: string[]): Promise<OnboardResponse> {
  if (favoriteItems.length !== 3) {
    throw new Error('Exactly 3 favorite items are required');
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
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!productTitle || !productDescription) {
    throw new Error('Product title and description are required');
  }

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
 * Health check to verify backend is running
 */
export async function checkHealth(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>('/health');
}
