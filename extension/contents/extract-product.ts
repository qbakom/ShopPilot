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
 * Check if current page is a single product page (not a listing/category)
 */
function classifyPage(): PageType {
  const url = window.location.href.toLowerCase();

  // ── Step 1: Check if page has multiple product-like cards ──
  // This is the most reliable listing indicator, regardless of URL pattern.
  // A "product card" is typically a link containing both an image and a price/title.
  const productCardSelectors = [
    // Explicit product card classes
    '[class*="product-card"]', '[class*="product-tile"]', '[class*="product-item"]',
    '[class*="ProductCard"]', '[class*="ProductTile"]', '[class*="ProductItem"]',
    '[data-testid*="product-card"]', '[data-testid*="product-tile"]',
    // Grid children that are links (common e-commerce pattern)
    '[class*="product-grid"] > *', '[class*="product-list"] > *',
    '[class*="products-grid"] > *', '[class*="catalog"] > *',
  ];
  const explicitCards = document.querySelectorAll(productCardSelectors.join(', '));
  if (explicitCards.length >= 3) return 'listing';

  // Heuristic: count <a> tags that contain both an <img> and a price-like pattern  
  const allLinks = document.querySelectorAll('a[href]');
  let productLinkCount = 0;
  for (const link of allLinks) {
    const hasImage = link.querySelector('img') !== null;
    const text = link.textContent || '';
    // Price patterns: $XX, XX zł, €XX, XX.XX, XX,XX (with currency context)
    const hasPrice = /(\$|€|£|zł|pln|usd|eur)\s*\d|\d+[.,]\d{2}\s*(zł|pln|usd|eur|\$|€|£)/i.test(text);
    if (hasImage && hasPrice) productLinkCount++;
    if (productLinkCount >= 3) return 'listing';
  }

  // ── Step 2: URL-based listing patterns ──
  const listingPatterns = [
    /\/categor/,
    /\/collection/,
    /\/search/,
    /\/s\?/,           // Amazon search
    /\/w\//,            // Nike category
    /[?&]q=/,           // Search query params
    /\/browse\//,
    /\/c\//,            // Generic category
    /\/shop\//,         // Shop sections
    /\/(men|women|kids|unisex|meskie|damskie|dzieciece)/i, // Gender categories
    /\/(shoes|clothing|bags|jackets|pants|shirts|kurtki|buty|spodnie)/i, // Product type categories
  ];
  if (listingPatterns.some(p => p.test(url))) {
    return 'listing';
  }

  // ── Step 3: Single product page indicators ──
  const productPatterns = [
    /\/product\//,
    /\/item\//,
    /\/p\//,
    /\/dp\//,       // Amazon
    /\/gp\/product/, // Amazon
    /\/products\//,
    /\/t\//,         // Nike
    /\/pd\//,        // Adidas
    /\/ip\//,        // Walmart
    /\/itm\//,       // eBay
    /\/detail\//,
    /\/sku\//,
    /\/buy\//,
  ];

  if (productPatterns.some(pattern => pattern.test(url))) {
    return 'product';
  }

  // Check for Product schema markup (JSON-LD or microdata)
  const schemaProduct = document.querySelector('[itemtype*="Product"]');
  if (schemaProduct) return 'product';

  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      if (data['@type'] === 'Product') return 'product';
      if (Array.isArray(data['@graph']) && data['@graph'].some((n: any) => n['@type'] === 'Product')) return 'product';
    } catch { /* ignore */ }
  }

  // Single add-to-cart button = product page
  const cartButtons = document.querySelectorAll(
    '[class*="add-to-cart"], [class*="add-to-bag"], [class*="buy-now"], ' +
    '[data-testid*="add-to-cart"], [data-testid*="add-to-bag"], ' +
    'button[aria-label*="cart" i], button[aria-label*="koszyk" i], button[aria-label*="bag" i], ' +
    '[itemprop="price"]'
  );
  if (cartButtons.length > 0) return 'product';

  return 'unknown';
}

/**
 * Extract complete product data from the page
 */
export function extractProductData(): ProductData | null {
  const pageType = classifyPage();
  if (pageType !== 'product') {
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

// ─── Product Picker (for listing/category pages) ─────────────────────

/**
 * Find the nearest product-like ancestor element (card/tile/link)
 */
function findProductAncestor(el: Element): Element | null {
  let current: Element | null = el;
  for (let i = 0; i < 10 && current; i++) {
    const tag = current.tagName.toLowerCase();
    const cls = current.className?.toString?.() || '';
    const href = current.getAttribute('href') || '';
    const testId = current.getAttribute('data-testid') || '';
    
    const isProductCard =
      // Class-based detection
      cls.match(/product|card|tile|item(?!s)|grid-cell|catalog-item/i) ||
      // Link to a product page
      (tag === 'a' && href.match(/\/product|\/p\/|\/dp\/|\/t\/|\/pd\/|\/item|\/itm|kurtka|buty|spodnie/i)) ||
      // Data attributes
      testId.match(/product|card|tile/i) ||
      // An <a> with an <img> inside + some text (generic product card heuristic)
      (tag === 'a' && current.querySelector('img') && (current.textContent?.trim()?.length ?? 0) > 5);

    if (isProductCard) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Extract product info from a selected product card element
 */
function extractFromCard(card: Element): ProductData {
  // Try to find a link to the product
  const link = card.tagName === 'A' ? card : card.querySelector('a[href]');
  const url = link?.getAttribute('href') || window.location.href;
  const fullUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).href;

  // ── Extract title ──
  // Look for headings or title-like elements FIRST (these usually have clean text)
  let title = '';
  const titleSelectors = [
    'h1', 'h2', 'h3', 'h4',
    '[class*="title"]', '[class*="name"]:not([class*="user"]):not([class*="brand"])',
    '[data-testid*="title"]', '[data-testid*="name"]'
  ];
  for (const sel of titleSelectors) {
    const el = card.querySelector(sel);
    if (el?.textContent?.trim() && el.textContent.trim().length > 3) {
      title = el.textContent.trim();
      break;
    }
  }
  // Fallback: aria-label
  if (!title && link?.getAttribute('aria-label')) {
    title = link.getAttribute('aria-label')!.trim();
  }
  if (!title && card.getAttribute('aria-label')) {
    title = card.getAttribute('aria-label')!.trim();
  }
  // Last resort: first text-only child elements (avoid grabbing prices)
  if (!title) {
    const texts = Array.from(card.querySelectorAll('span, p, div'))
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 3 && t.length < 100 && !/^\d+[.,]/.test(t) && !/^\$|€|£/.test(t));
    title = texts[0] || 'Selected Product';
  }

  // ── Extract description ──
  // Gather color, subtitle, category, and image alt text as features
  const descParts: string[] = [];
  const descSelectors = [
    '[class*="subtitle"]', '[class*="color"]', '[class*="description"]',
    '[class*="detail"]', '[class*="category"]', '[class*="variant"]'
  ];
  for (const sel of descSelectors) {
    const el = card.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text && text !== title && !descParts.includes(text)) {
      descParts.push(text);
    }
  }
  // Add alt text from images (often descriptive)
  const img = card.querySelector('img');
  if (img?.alt && img.alt !== title && img.alt.length > 3) {
    descParts.push(img.alt);
  }
  // Add price as context
  const priceEl = card.querySelector('[class*="price"], [class*="Price"], [data-testid*="price"]');
  if (priceEl?.textContent?.trim()) {
    descParts.push('Price: ' + priceEl.textContent.trim());
  }

  const description = descParts.length > 0 ? descParts.join('. ') : title;

  return {
    title,
    description,
    url: fullUrl
  };
}

/**
 * Create the picker overlay and highlight elements
 */
function createPickerUI() {
  // Semi-transparent overlay instructions
  pickerOverlay = document.createElement('div');
  pickerOverlay.id = 'specscout-picker-overlay';
  pickerOverlay.innerHTML = `
    <div style="
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483647;
      background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 12px;
      font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); pointer-events: none;
      display: flex; align-items: center; gap: 8px;
    ">
      <span style="font-size: 18px;">🎯</span>
      Click on a product to analyze it
      <span style="opacity: 0.7; font-weight: 400; margin-left: 8px;">ESC to cancel</span>
    </div>
  `;
  document.body.appendChild(pickerOverlay);

  // Highlight box that follows the cursor
  pickerHighlight = document.createElement('div');
  pickerHighlight.id = 'specscout-picker-highlight';
  pickerHighlight.style.cssText = `
    position: fixed; pointer-events: none; z-index: 2147483646;
    border: 3px solid #0ea5e9; border-radius: 8px;
    background: rgba(14, 165, 233, 0.08);
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.3);
    transition: all 0.15s ease;
    display: none;
  `;
  document.body.appendChild(pickerHighlight);
}

/**
 * Handle mousemove during picker mode — highlight product cards
 */
function onPickerMouseMove(e: MouseEvent) {
  const target = e.target as Element;
  const card = findProductAncestor(target);

  if (card && card !== currentHoveredEl) {
    currentHoveredEl = card;
    const rect = card.getBoundingClientRect();
    if (pickerHighlight) {
      pickerHighlight.style.display = 'block';
      pickerHighlight.style.top = rect.top - 3 + 'px';
      pickerHighlight.style.left = rect.left - 3 + 'px';
      pickerHighlight.style.width = rect.width + 6 + 'px';
      pickerHighlight.style.height = rect.height + 6 + 'px';
    }
  } else if (!card) {
    currentHoveredEl = null;
    if (pickerHighlight) pickerHighlight.style.display = 'none';
  }
}

/**
 * Handle click during picker mode — select the product
 */
function onPickerClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  const target = e.target as Element;
  const card = findProductAncestor(target);

  if (card) {
    const productData = extractFromCard(card);
    // Send result back to extension
    chrome.runtime.sendMessage({
      action: 'productPicked',
      productData
    });
    deactivatePicker();
  }
}

/**
 * Handle ESC key to cancel picker
 */
function onPickerKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    chrome.runtime.sendMessage({ action: 'pickerCancelled' });
    deactivatePicker();
  }
}

/**
 * Activate the product picker mode
 */
function activatePicker() {
  if (pickerActive) return;
  pickerActive = true;
  createPickerUI();
  document.addEventListener('mousemove', onPickerMouseMove, true);
  document.addEventListener('click', onPickerClick, true);
  document.addEventListener('keydown', onPickerKeyDown, true);
  document.body.style.cursor = 'crosshair';
}

/**
 * Deactivate the product picker mode and clean up
 */
function deactivatePicker() {
  pickerActive = false;
  document.removeEventListener('mousemove', onPickerMouseMove, true);
  document.removeEventListener('click', onPickerClick, true);
  document.removeEventListener('keydown', onPickerKeyDown, true);
  document.body.style.cursor = '';
  currentHoveredEl = null;
  pickerOverlay?.remove();
  pickerHighlight?.remove();
  pickerOverlay = null;
  pickerHighlight = null;
}

// ─── Message Listener ────────────────────────────────────────────────

// Listen for messages from side panel / background
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'extractProduct') {
    const productData = extractProductData();
    const pageType = classifyPage();
    sendResponse({ productData, pageType });
  } else if (request.action === 'startPicker') {
    activatePicker();
    sendResponse({ ok: true });
  } else if (request.action === 'stopPicker') {
    deactivatePicker();
    sendResponse({ ok: true });
  }
  return true; // Keep channel open for async response
});
