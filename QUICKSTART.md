# SpecScout - Quick Start Guide

Get SpecScout running in 5 minutes!

## 📋 Prerequisites Check

Before starting, ensure you have:

```bash
# Check Python version (need 3.9+)
python --version

# Check Node.js version (need 18+)
node --version

# Check npm
npm --version
```

If any are missing, install them first:
- Python: https://www.python.org/downloads/
- Node.js: https://nodejs.org/

## 🚀 Setup in 3 Steps

### Step 1: Start the Backend (2 minutes)

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate

# Install dependencies (first time will download AI model ~80MB)
pip install -r requirements.txt

# Start the server
python main.py
```

✅ **Verify**: Visit http://localhost:8000/docs - you should see API documentation

### Step 2: Build the Extension (2 minutes)

Open a NEW terminal window:

```bash
# Navigate to extension
cd extension

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development build (with hot reload)
npm run dev
```

✅ **Verify**: You should see "Ready" message and a `build/chrome-mv3-dev` folder created

### Step 3: Load in Chrome (1 minute)

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Toggle ON "Developer mode" (top-right)
4. Click "Load unpacked"
5. Navigate to `ShopPilot/extension/build/chrome-mv3-dev`
6. Click "Select Folder"

✅ **Verify**: You should see "SpecScout" extension installed

## 🎉 First Use

### Calibrate Your Taste

1. Click the SpecScout icon in Chrome toolbar
2. Click "Open side panel" (if needed)
3. Fill in 3 items you love - be specific!

**Examples:**
```
Item 1: Black minimalist gore-tex waterproof jacket with hidden pockets
Item 2: Charcoal grey merino wool crew neck sweater, fitted cut
Item 3: Dark indigo Japanese selvedge denim jeans with subtle whiskers
```

4. Click "Calibrate My Taste"
5. Wait a few seconds (AI is processing)

### Analyze Your First Product

1. Visit any product page, for example:
   - Amazon: https://www.amazon.com/
   - eBay: https://www.ebay.com/
   - Any Shopify store

2. Navigate to a specific product

3. Open SpecScout side panel

4. Click "Analyze This Product"

5. View your match score!

## 🔧 Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError`
```bash
# Make sure venv is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Problem**: Port 8000 already in use
```bash
# Change port in main.py (last line):
uvicorn.run(app, host="0.0.0.0", port=8001)  # Use 8001 instead

# Also update extension/.env:
PLASMO_PUBLIC_API_URL=http://localhost:8001
```

**Problem**: Slow first request
- This is normal! The AI model loads on first use
- Subsequent requests will be fast

### Extension Issues

**Problem**: `npm install` fails
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Extension not appearing
```bash
# Rebuild
npm run dev

# Reload extension in chrome://extensions/
# Click the refresh icon on SpecScout card
```

**Problem**: "No product detected"
- Refresh the product page
- Try a different product page
- Check if page has standard e-commerce markup

**Problem**: API connection error
- Verify backend is running at http://localhost:8000
- Check `.env` file has correct URL
- Look for CORS errors in DevTools Console

### General Issues

**Problem**: Extension shows errors
```bash
# Open DevTools Console (F12)
# Check for JavaScript errors
# Common fixes:
1. Refresh the page
2. Reload extension in chrome://extensions/
3. Rebuild: npm run dev
```

## 📝 Development Workflow

### Making Changes

**Backend changes:**
```bash
# The server auto-reloads with uvicorn
# Just save your Python files
```

**Extension changes:**
```bash
# Plasmo has hot reload
# Save your .tsx/.ts files
# Extension updates automatically
```

### Viewing Logs

**Backend logs:**
- Terminal where `python main.py` is running
- Shows API requests and AI processing

**Extension logs:**
- Chrome DevTools Console (F12)
- Background logs: `chrome://extensions/` → SpecScout → "service worker" link

## 🧪 Testing the System

### Test Backend Directly

```bash
# Test health check
curl http://localhost:8000/health

# Test onboarding
curl -X POST http://localhost:8000/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "favorite_items": [
      "Black leather jacket with silver zippers",
      "White minimalist sneakers",
      "Dark wash slim fit jeans"
    ]
  }'

# Copy the user_id from response, then test analysis
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "PASTE_USER_ID_HERE",
    "product_title": "Leather Moto Jacket",
    "product_description": "Classic black leather motorcycle jacket"
  }'
```

### Test Product Detection

1. Open any product page
2. Open DevTools Console (F12)
3. Type: `window.extractProductData()`
4. Should return product title and description

## 📚 Next Steps

- Read the full README.md for architecture details
- Explore backend/README.md for API documentation
- Check extension/README.md for development guide
- Visit http://localhost:8000/docs for interactive API docs

## 🆘 Still Having Issues?

1. Make sure both backend AND extension are running
2. Check all terminals for error messages
3. Verify Chrome Developer Mode is enabled
4. Try a fresh restart:
   - Stop backend (Ctrl+C)
   - Stop extension build (Ctrl+C)
   - Start backend again
   - Start extension build again
   - Reload extension in Chrome

## 🎯 Success Checklist

- [ ] Backend running at http://localhost:8000
- [ ] Backend API docs accessible at http://localhost:8000/docs
- [ ] Extension installed in Chrome
- [ ] Can see SpecScout in Chrome toolbar
- [ ] Side panel opens when clicked
- [ ] Onboarding form accepts 3 items
- [ ] Profile created successfully
- [ ] Product page detection works
- [ ] Product analysis returns match score

All checked? You're ready to start shopping smarter! 🎉
