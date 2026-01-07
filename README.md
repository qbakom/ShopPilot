# SpecScout - AI Shopping Assistant

> Overcome decision paralysis with AI-powered product matching based on your personal "Style DNA"

SpecScout is a Chrome extension and backend API that helps you make confident shopping decisions by scoring products against your personal taste profile using advanced NLP and vector similarity matching.

## 🎯 The Problem

Online shopping is overwhelming:
- Too many choices lead to decision paralysis
- Generic recommendations don't match your taste
- Hard to know if a product fits your style

## 💡 The Solution

SpecScout uses AI to:
1. Learn your personal style from items you love
2. Analyze any product against your taste profile
3. Give you a match score with actionable insights

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Onboarding │  │   Product    │  │    Match     │     │
│  │     Form     │→ │   Analysis   │→ │    Result    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                                 │
│  ┌────────────────────────────────────────────────┐        │
│  │          Zustand State + Chrome Storage        │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ↓ API Calls
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   /onboard   │  │   /analyze   │  │   /health    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                                 │
│  ┌────────────────────────────────────────────────┐        │
│  │              AI Service Module                 │        │
│  │  • Sentence Transformers (all-MiniLM-L6-v2)   │        │
│  │  • Vector Embeddings (384-dim)                 │        │
│  │  • Cosine Similarity Matching                  │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 🧠 How It Works

### The Math Behind the Magic

1. **User Onboarding** (Vectorization)
   ```
   Input: 3 favorite items (text descriptions)
   ↓
   Sentence Transformer (all-MiniLM-L6-v2)
   ↓
   3 vectors (384-dimensional each)
   ↓
   Mean Vector (Centroid) = User's "Style DNA"
   ```

2. **Product Analysis** (Similarity Matching)
   ```
   Input: Product title + description
   ↓
   Sentence Transformer
   ↓
   Product Vector (384-dimensional)
   ↓
   Cosine Similarity(User Vector, Product Vector)
   ↓
   Match Score (0-100%)
   ```

3. **Cosine Similarity Formula**
   ```
   similarity = (A · B) / (||A|| × ||B||)

   Where:
   - A = User's centroid vector
   - B = Product vector
   - Result ranges from -1 to 1 (normalized to 0-100%)
   ```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Chrome browser
- Git

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

Backend will run at `http://localhost:8000`

### Extension Setup

```bash
# Navigate to extension
cd extension

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development build
npm run dev
```

### Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/build/chrome-mv3-dev`

## 📖 Usage Guide

### Step 1: Calibrate Your Taste

1. Click the SpecScout icon in Chrome
2. Open the side panel
3. Enter 3 items you absolutely love:
   ```
   Example:
   - Black minimalist gore-tex jacket with hidden pockets
   - Merino wool crew neck sweater in charcoal grey
   - Japanese selvedge denim jeans with subtle fading
   ```
4. Click "Calibrate My Taste"

### Step 2: Analyze Products

1. Visit any product page (Amazon, eBay, etc.)
2. Open SpecScout side panel
3. Click "Analyze This Product"
4. Get instant match score!

### Step 3: Make Confident Decisions

- **85-100%**: Perfect Match - Buy with confidence
- **70-84%**: Great Fit - Highly recommended
- **55-69%**: Good Alternative - Worth considering
- **40-54%**: Moderate Match - Explore if curious
- **0-39%**: Not Your Style - Probably skip

## 📁 Project Structure

```
ShopPilot/
├── backend/                    # FastAPI backend
│   ├── main.py                # API endpoints
│   ├── ai_service.py          # ML logic
│   ├── requirements.txt       # Python dependencies
│   └── README.md              # Backend docs
│
├── extension/                  # Chrome extension
│   ├── sidepanel/             # Side panel UI
│   │   └── index.tsx          # Main panel component
│   ├── components/            # React components
│   │   ├── OnboardingForm.tsx
│   │   ├── ProductAnalysis.tsx
│   │   └── MatchResult.tsx
│   ├── contents/              # Content scripts
│   │   └── extract-product.ts # Product data extraction
│   ├── store.ts               # State management
│   ├── api.ts                 # Backend client
│   ├── types.ts               # TypeScript types
│   ├── package.json
│   └── README.md              # Extension docs
│
└── README.md                   # This file
```

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Sentence Transformers**: State-of-the-art NLP embeddings
- **Scikit-learn**: Cosine similarity calculations
- **Uvicorn**: ASGI server

### Frontend
- **Plasmo**: Modern extension framework
- **React**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **Lucide React**: Icons

## 🎨 Features

### MVP Features (Current)
- ✅ User taste calibration with 3 favorite items
- ✅ Automatic product detection
- ✅ AI-powered match scoring
- ✅ Visual match results
- ✅ Side panel UI
- ✅ Chrome storage persistence

### Future Enhancements
- 🔄 Historical analysis tracking
- 🔄 Style evolution over time
- 🔄 Multi-category profiles (fashion, tech, home)
- 🔄 Collaborative filtering
- 🔄 Price/value analysis
- 🔄 Browser notifications
- 🔄 Wishlist integration

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Test onboarding endpoint
curl -X POST http://localhost:8000/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "favorite_items": [
      "Black leather jacket",
      "Minimalist watch",
      "White sneakers"
    ]
  }'

# Test analysis endpoint (use user_id from above)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "product_title": "Slim Fit Denim Jacket",
    "product_description": "Classic blue denim jacket with modern slim fit"
  }'
```

### Extension Testing

1. Visit test e-commerce sites
2. Check DevTools Console for errors
3. Test on different product page layouts
4. Verify state persistence across sessions

## 📊 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### POST /onboard
Create user taste profile

**Request:**
```json
{
  "favorite_items": ["item1", "item2", "item3"]
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "message": "Taste profile created successfully",
  "calibrated": true,
  "favorite_items": [...]
}
```

#### POST /analyze
Analyze product match

**Request:**
```json
{
  "user_id": "uuid",
  "product_title": "Product Name",
  "product_description": "Product details..."
}
```

**Response:**
```json
{
  "match_score": 0.87,
  "percentage": 87.0,
  "label": "Perfect Match",
  "reasoning": "Based on your style preferences..."
}
```

## 🔐 Security & Privacy

- User data stored locally in Chrome storage
- API uses in-memory storage (MVP only)
- No personal data collection
- No tracking or analytics
- All processing done client-side and server-side (no third parties)

## 🚀 Deployment

### Backend (Production)

```bash
# Build Docker image
cd backend
docker build -t specscout-api .

# Deploy to cloud (AWS, GCP, Azure, etc.)
# Update extension API URL to production endpoint
```

### Extension (Chrome Web Store)

```bash
cd extension
npm run build
npm run package

# Upload zip to Chrome Web Store
# https://chrome.google.com/webstore/devconsole
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Sentence Transformers team for the amazing models
- Plasmo framework for modern extension development
- FastAPI for the excellent Python framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ShopPilot/issues)
- **Docs**: See `/backend/README.md` and `/extension/README.md`

---

**Built with ❤️ using AI and modern web technologies**
