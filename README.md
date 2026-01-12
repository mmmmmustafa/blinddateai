# 💫 BlindDate AI Agent

A revolutionary dating app where AI serves as the matchmaker and conversation facilitator. Users never see profiles upfront - instead, they chat anonymously with matches while AI monitors compatibility in real-time. When genuine connection is detected (80%+ match), both profiles are revealed.

## 🌟 Features

- **AI-Powered Onboarding** - Natural conversation builds your profile, no boring forms
- **Smart Matching** - Vector-based compatibility scoring with weighted dimensions
- **Blind Chat** - Anonymous messaging with AI-generated pseudonyms
- **Real-time Compatibility** - Score updates as you chat
- **AI Wingman** - Get conversation suggestions when you need them
- **Profile Reveal** - Automatic at 80%+ compatibility

## 📱 Screenshots

*Coming soon*

## 🏗️ Architecture

```
blinddate/
├── mobile/                 # React Native (Expo) app
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API & WebSocket
│   │   ├── stores/         # Zustand state
│   │   └── config/         # Environment config
│   └── assets/             # Images and icons
│
├── backend/                # Python FastAPI
│   ├── app/
│   │   ├── api/            # REST endpoints
│   │   ├── agents/         # AI agents
│   │   ├── models/         # SQLAlchemy models
│   │   └── services/       # Business logic
│   └── alembic/            # Database migrations
│
└── docker-compose.yml      # Development setup
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- OpenAI API key

### 1. Clone and Setup

```bash
cd blinddate

# Create backend environment file
cat > backend/.env << EOF
OPENAI_API_KEY=sk-your-openai-api-key
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/blinddate
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EOF
```

### 2. Start Backend with Docker

```bash
# Start all services (PostgreSQL with pgvector, Redis, FastAPI)
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### 3. Start Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

### 4. Run on Device/Simulator

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

## 🔧 Development

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally (with Docker for DB/Redis)
docker-compose up -d db redis
uvicorn app.main:app --reload
```

### Mobile Development

```bash
cd mobile

# Run with tunnel for physical device testing
npx expo start --tunnel
```

### API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧠 AI Agents

### Onboarding Agent
Conducts natural conversations to extract:
- Basic info (name, age, location)
- Personality traits
- Values and dealbreakers
- Interests and hobbies
- Relationship preferences

### Chat Facilitator
- Analyzes messages for sentiment and engagement
- Provides conversation suggestions
- Monitors for safety concerns

### Compatibility Scorer
Calculates compatibility based on:
| Dimension | Weight |
|-----------|--------|
| Values Alignment | 30% |
| Personality Fit | 25% |
| Interest Overlap | 20% |
| Preference Match | 15% |
| Complementary Traits | 10% |

## 📊 Data Models

### User Flow States
```
ONBOARDING → ACTIVE → IN_CHAT → ACTIVE (loop)
                ↓
              PAUSED
```

### Match States
```
CHATTING → REVEALED → CONTINUED
                ↓           ↓
              ENDED      (back to chat)
```

## 🔐 Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 and embeddings |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `TWILIO_ACCOUNT_SID` | (Optional) Twilio for SMS OTP |
| `TWILIO_AUTH_TOKEN` | (Optional) Twilio auth token |
| `TWILIO_PHONE_NUMBER` | (Optional) Twilio phone number |

### Mobile
Configure in `src/config/index.ts`:
- `API_URL` - Backend API endpoint
- `WS_URL` - WebSocket endpoint

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Mobile tests
cd mobile
npm test
```

## 📦 Deployment

### Backend
1. Build Docker image: `docker build -t blinddate-api ./backend`
2. Deploy to your cloud provider (AWS ECS, GCP Cloud Run, etc.)
3. Set up PostgreSQL with pgvector extension
4. Set up Redis
5. Configure environment variables

### Mobile
1. Configure `eas.json` for Expo Application Services
2. Build: `eas build --platform all`
3. Submit: `eas submit --platform all`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for GPT-4 and embeddings
- FastAPI for the excellent Python framework
- Expo for making React Native development easier
- pgvector for vector similarity search in PostgreSQL
