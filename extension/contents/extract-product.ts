/**
 * Content script for extracting product information from web pages
 * Runs on e-commerce sites to scrape product title and description
 */

import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://*/*"],
  all_frames: false
};

/**
 * Product data extraction strategies for different sites
 */
interface ProductData {
  title: string;
  description: string;
  url: string;
}

/**
 * Extract product title from various HTML elements
 */
function extractTitle(): string {
  // Strategy 1: h1 tag (most common)
  const h1 = document.querySelector('h1');
  if (h1?.textContent?.trim()) {
    return h1.textContent.trim();
  }

  // Strategy 2: og:title meta tag
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.getAttribute('content')) {
    return ogTitle.getAttribute('content')!.trim();
  }

  // Strategy 3: title tag
  const titleTag = document.querySelector('title');
  if (titleTag?.textContent?.trim()) {
    return titleTag.textContent.trim();
  }

  // Strategy 4: Common product title classes/IDs
  const selectors = [
    '[data-testid*="product-title"]',
    '[class*="product-title"]',
    '[class*="product-name"]',
    '[id*="product-title"]',
    '[id*="product-name"]',
    '.productTitle',
    '#productTitle'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      return element.textContent.trim();
    }
  }

  return 'Unknown Product';
}

/**
 * Extract product description from various sources
 */
function extractDescription(): string {
  // Strategy 1: og:description meta tag
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc?.getAttribute('content')) {
    return ogDesc.getAttribute('content')!.trim();
  }

  // Strategy 2: meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc?.getAttribute('content')) {
    return metaDesc.getAttribute('content')!.trim();
  }

  // Strategy 3: Common product description selectors
  const selectors = [
    '[data-testid*="product-description"]',
    '[class*="product-description"]',
    '[class*="product-details"]',
    '[id*="product-description"]',
    '[id*="productDescription"]',
    '.product-description',
    '#productDescription',
    '[itemprop="description"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      return element.textContent.trim();
    }
  }

  // Strategy 4: Get first few paragraphs as fallback
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.textContent?.trim())
    .filter(text => text && text.length > 50)
    .slice(0, 3)
    .join(' ');

  if (paragraphs) {
    return paragraphs;
  }

  return 'No description available';
}

/**
 * Check if current page is likely a product page
 */
function isProductPage(): boolean {
  const url = window.location.href.toLowerCase();

  // Common product URL patterns
  const productPatterns = [
    /\/product\//,
    /\/item\//,
    /\/p\//,
    /\/dp\//,  // Amazon
    /\/gp\//,  // Amazon
    /\/products\//,
    /\/shop\//
  ];

  // Check URL patterns
  if (productPatterns.some(pattern => pattern.test(url))) {
    return true;
  }

  // Check for product schema markup
  const schemaProduct = document.querySelector('[itemtype*="Product"]');
  if (schemaProduct) {
    return true;
  }

  // Check for common e-commerce indicators
  const hasProductIndicators =
    document.querySelector('[class*="add-to-cart"]') ||
    document.querySelector('[class*="buy-now"]') ||
    document.querySelector('[class*="product-price"]') ||
    document.querySelector('[itemprop="price"]');

  return Boolean(hasProductIndicators);
}

/**
 * Extract complete product data from the page
 */
export function extractProductData(): ProductData | null {
  if (!isProductPage()) {
    return null;
  }

  const title = extractTitle();
  const description = extractDescription();

  // Only return if we have meaningful data
  if (title === 'Unknown Product' && description === 'No description available') {
    return null;
  }

  return {
    title,
    description,
    url: window.location.href
  };
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProduct') {
    const productData = extractProductData();
    sendResponse({ productData });
  }
  return true; // Keep channel open for async response
});

// Export for testing/debugging
if (typeof window !== 'undefined') {
  (window as any).extractProductData = extractProductData;
}
