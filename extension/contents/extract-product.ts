/**
 * Content script for extracting product information from web pages
 * Runs on e-commerce sites to scrape product title and description.
 * Also provides a visual "product picker" mode for category/listing pages.
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
 * Page classification: is this a single-product page or a listing/category page?
 */
type PageType = 'product' | 'listing' | 'unknown';

// ─── Product Picker State ────────────────────────────────────────────
let pickerActive = false;
let pickerOverlay: HTMLDivElement | null = null;
let pickerHighlight: HTMLDivElement | null = null;
let currentHoveredEl: Element | null = null;

/**
 * Extract product title from various HTML elements
 */
function extractTitle(): string {
  // Strategy 1: JSON-LD structured data (most reliable)
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const product = data['@type'] === 'Product' ? data 
        : (Array.isArray(data['@graph']) ? data['@graph'].find((n: any) => n['@type'] === 'Product') : null);
      if (product?.name) {
        return product.name.trim();
      }
    } catch { /* ignore parse errors */ }
  }

  // Strategy 2: h1 tag (most common)
  const h1 = document.querySelector('h1');
  if (h1?.textContent?.trim()) {
    return h1.textContent.trim();
  }

  // Strategy 3: og:title meta tag
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.getAttribute('content')) {
    return ogTitle.getAttribute('content')!.trim();
  }

  // Strategy 4: title tag
  const titleTag = document.querySelector('title');
  if (titleTag?.textContent?.trim()) {
    return titleTag.textContent.trim();
  }

  // Strategy 5: Common product title classes/IDs
  const selectors = [
    '[data-testid*="product-title"]',
    '[data-testid*="product_title"]',
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
  // Strategy 1: JSON-LD structured data (most reliable on modern sites)
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const product = data['@type'] === 'Product' ? data 
        : (Array.isArray(data['@graph']) ? data['@graph'].find((n: any) => n['@type'] === 'Product') : null);
      if (product?.description) {
        return product.description.trim();
      }
    } catch { /* ignore parse errors */ }
  }

  // Strategy 2: og:description meta tag
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc?.getAttribute('content')) {
    return ogDesc.getAttribute('content')!.trim();
  }

  // Strategy 3: meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc?.getAttribute('content')) {
    return metaDesc.getAttribute('content')!.trim();
  }

  // Strategy 4: Common product description selectors
  const selectors = [
    '[data-testid*="product-description"]',
    '[class*="product-description"]',
    '[class*="product-details"]',
    '[class*="description-preview"]',
    '[class*="product-info"]',
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

  // Strategy 5: Get first few paragraphs as fallback
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

  // Common product URL patterns for major e-commerce sites
  const productPatterns = [
    /\/product\//,
    /\/item\//,
    /\/p\//,
    /\/dp\//,       // Amazon
    /\/gp\/product/, // Amazon
    /\/products\//,
    /\/shop\//,
    /\/t\//,         // Nike
    /\/pd\//,        // Adidas
    /\/ip\//,        // Walmart
    /\/itm\//,       // eBay
    /\/detail\//,
    /\/sku\//,
    /\/buy\//,
  ];

  // Check URL patterns
  if (productPatterns.some(pattern => pattern.test(url))) {
    return true;
  }

  // Check for product schema markup (JSON-LD or microdata)
  const schemaProduct = document.querySelector('[itemtype*="Product"]');
  if (schemaProduct) {
    return true;
  }

  // Check JSON-LD structured data for Product type
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const type = data['@type'] || (Array.isArray(data['@graph']) && data['@graph'].find((n: any) => n['@type'] === 'Product'));
      if (type === 'Product' || type) {
        return true;
      }
    } catch { /* ignore parse errors */ }
  }

  // Check for common e-commerce indicators (broader selectors)
  const hasProductIndicators =
    document.querySelector('[class*="add-to-cart"]') ||
    document.querySelector('[class*="add-to-bag"]') ||
    document.querySelector('[class*="buy-now"]') ||
    document.querySelector('[class*="product-price"]') ||
    document.querySelector('[itemprop="price"]') ||
    document.querySelector('[data-testid*="add-to-cart"]') ||
    document.querySelector('[data-testid*="add-to-bag"]') ||
    document.querySelector('button[aria-label*="cart" i]') ||
    document.querySelector('button[aria-label*="koszyk" i]') ||
    document.querySelector('button[aria-label*="bag" i]');

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
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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
