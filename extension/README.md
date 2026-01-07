# SpecScout Chrome Extension

AI-powered shopping assistant Chrome extension that helps you make better purchasing decisions by matching products to your personal style profile.

## Features

- **Taste Calibration**: Define your style with 3 favorite items
- **Smart Product Detection**: Automatically detects products on e-commerce sites
- **AI Matching**: Uses sentence transformers to calculate match scores
- **Visual Results**: Beautiful UI showing match percentage and recommendations
- **Side Panel UI**: Non-intrusive side panel interface

## Tech Stack

- **Framework**: Plasmo (React + TypeScript)
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **Icons**: Lucide React
- **Chrome APIs**: Side Panel, Active Tab, Storage

## Setup

### 1. Install Dependencies

```bash
cd extension
npm install
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` to point to your backend:

```env
PLASMO_PUBLIC_API_URL=http://localhost:8000
```

### 3. Development Mode

Run the extension in development mode with hot reload:

```bash
npm run dev
```

This creates a `build/chrome-mv3-dev` directory.

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `build/chrome-mv3-dev` directory

### 5. Production Build

To create a production build:

```bash
npm run build
```

This creates an optimized build in `build/chrome-mv3-prod`.

## Usage

### First Time Setup

1. Click the SpecScout extension icon
2. Open the side panel
3. Enter 3 items you love (be descriptive!)
4. Click "Calibrate My Taste"

### Analyzing Products

1. Navigate to any product page (Amazon, eBay, etc.)
2. Open the SpecScout side panel
3. Click "Analyze This Product"
4. View your match score and recommendations

## Project Structure

```
extension/
├── sidepanel/
│   └── index.tsx           # Main side panel component
├── components/
│   ├── OnboardingForm.tsx  # User taste calibration form
│   ├── ProductAnalysis.tsx # Product analysis interface
│   └── MatchResult.tsx     # Match score display
├── contents/
│   └── extract-product.ts  # Content script for product extraction
├── types.ts                # TypeScript type definitions
├── store.ts                # Zustand state management
├── api.ts                  # Backend API client
├── style.css               # Tailwind CSS styles
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── tailwind.config.js      # Tailwind configuration
```

## How It Works

### 1. Onboarding Flow

```
User enters 3 items → Backend vectorizes → Centroid calculated → User profile stored
```

### 2. Product Analysis Flow

```
Content script extracts product → API analyzes → Cosine similarity → Match score displayed
```

### 3. Product Detection

The extension uses multiple strategies to extract product information:

- **Title**: h1 tags, og:title meta, common product selectors
- **Description**: og:description, meta description, product detail divs
- **URL Patterns**: Detects `/product/`, `/item/`, `/p/`, etc.

### 4. State Management

Zustand store manages:
- User profile (persisted to Chrome storage)
- Current product data
- Match results
- UI state (loading, errors)

## Development

### Adding New Product Detectors

Edit `contents/extract-product.ts` and add selectors for specific e-commerce sites:

```typescript
const selectors = [
  '[data-testid*="product-title"]',
  '.your-custom-selector',  // Add your selector
];
```

### Customizing Match Labels

Edit `backend/ai_service.py` to adjust thresholds:

```python
def get_match_label(self, score: float) -> str:
    percentage = score * 100
    if percentage >= 85:
        return "Perfect Match"
    # Adjust thresholds here
```

## Supported Sites

The extension works on most e-commerce sites including:
- Amazon
- eBay
- Shopify stores
- WooCommerce stores
- Custom e-commerce sites with standard markup

## Troubleshooting

### Extension not detecting products

1. Refresh the page
2. Check if the site uses standard HTML (not heavy JavaScript rendering)
3. Open DevTools and check content script logs

### API connection errors

1. Ensure backend is running on `http://localhost:8000`
2. Check `.env` file has correct API URL
3. Look for CORS errors in console

### Build errors

1. Delete `node_modules` and reinstall: `npm install`
2. Clear Plasmo cache: `rm -rf .plasmo`
3. Rebuild: `npm run dev`

## Production Deployment

1. Build the extension: `npm run build`
2. Package for Chrome Web Store: `npm run package`
3. Upload the generated zip to Chrome Web Store
4. Deploy backend to production server
5. Update `PLASMO_PUBLIC_API_URL` to production URL

## Contributing

When adding features:
1. Update type definitions in `types.ts`
2. Add actions to Zustand store if needed
3. Update UI components
4. Test on multiple e-commerce sites

## License

MIT
