# Brain-Battle Study App - Complete Documentation
**Last Updated: October 16, 2024**

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Database Schema](#database-schema)
4. [Authentication System](#authentication-system)
5. [Core Features](#core-features)
6. [API Endpoints](#api-endpoints)
7. [File Structure](#file-structure)
8. [Setup Instructions](#setup-instructions)
9. [Development Workflow](#development-workflow)
10. [Known Issues & Future Work](#known-issues--future-work)

---

## 🎯 Project Overview

**Brain-Battle** is an AI-powered multiplayer study application that allows friends to join private lobbies, upload educational documents (PDFs, lessons), and compete in AI-generated quizzes. The app features real-time progress tracking, competitive elements, and gamification with XP/leveling systems.

### Key Features:
- **Singleplayer Mode**: Upload documents, generate study notes, take AI-powered quizzes
- **Multiplayer Mode**: Create/join private rooms, real-time competition, shared study sessions
- **AI Integration**: OpenAI-powered question generation and study note creation
- **Vector Embeddings**: Semantic search for document-specific questions
- **Gamification**: XP system, levels, rankings, and achievements
- **Real-time Features**: Live progress tracking, member lists, chat functionality

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom authentication system
- **Real-time**: Supabase Realtime
- **File Storage**: Supabase Storage
- **AI Services**: OpenAI API (GPT-4o, text-embedding-3-small)
- **Vector Search**: pgvector extension

### Key Dependencies
```json
{
  "next": "15.5.4",
  "react": "19.1.0",
  "typescript": "^5",
  "tailwindcss": "^4",
  "framer-motion": "^12.23.24",
  "@supabase/supabase-js": "^2.75.0",
  "openai": "^6.3.0",
  "bcryptjs": "^3.0.2",
  "pdf-parse": "^2.3.12"
}
```

---

## 🗄️ Database Schema

### Core Tables

#### `users` - User Profiles
```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `player_stats` - User Statistics
```sql
CREATE TABLE player_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_quizzes INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0.00,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `rooms` - Game Rooms
```sql
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(100),
  difficulty VARCHAR(20) DEFAULT 'medium',
  max_players INTEGER DEFAULT 4,
  current_players INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `room_members` - Room Participants
```sql
CREATE TABLE room_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  is_host BOOLEAN DEFAULT FALSE
);
```

#### `document_embeddings` - Vector Storage
```sql
CREATE TABLE document_embeddings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  chunk_index INTEGER,
  chunk_text TEXT NOT NULL,
  chunk_metadata JSONB,
  embedding VECTOR(1536),
  subject_tags TEXT[],
  course_topics TEXT[],
  difficulty_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Vector Search Function
```sql
CREATE OR REPLACE FUNCTION search_documents_by_similarity(
  query_embedding VECTOR(1536),
  user_id_param UUID,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  file_name VARCHAR,
  chunk_text TEXT,
  similarity_score FLOAT,
  subject_tags TEXT[],
  course_topics TEXT[],
  difficulty_level VARCHAR
)
```

---

## 🔐 Authentication System

### Custom Authentication Flow
The app uses a custom authentication system instead of Supabase Auth to bypass strict email validation and integrate directly with custom user tables.

#### Key Files:
- `src/lib/actions/custom-auth.ts` - Server actions for auth
- `src/lib/auth/custom-auth.ts` - Authentication utilities
- `src/lib/supabase/middleware.ts` - Route protection

#### Authentication Functions:
```typescript
// Registration
export async function signup(formData: FormData)

// Login
export async function login(formData: FormData)

// Logout
export async function logout()

// User verification
export async function registerUser(username: string, email: string, password: string)
export async function authenticateUser(username: string, password: string)
```

#### Session Management:
- Uses Next.js cookies for session storage
- Custom session validation middleware
- Protected routes with automatic redirects

---

## 🚀 Core Features

### 1. Singleplayer Mode

#### Document Upload & Processing
- **Supported Formats**: PDF, TXT, and other text files
- **Text Extraction**: Uses `pdf-parse` for PDF processing
- **Image Extraction**: Placeholder for PyMuPDF integration
- **File Validation**: Size and type checking

#### Study Notes Generation
- **AI-Powered**: Uses OpenAI GPT-4o with structured outputs
- **Content Analysis**: Extracts key concepts, terms, and outlines
- **Visual Enhancement**: Integrates Unsplash API for educational images
- **Structured Format**: JSON schema for consistent output

#### Quiz Generation
- **Document-Specific**: Questions based on uploaded content
- **Semantic Search**: Uses vector embeddings for relevant content retrieval
- **Mixed Question Types**: Multiple choice and open-ended questions
- **Difficulty Adaptation**: AI determines question complexity based on content

### 2. Multiplayer Mode

#### Room Management
- **Room Creation**: Generate unique 6-character codes
- **Room Joining**: Join by code with real-time member updates
- **Host Controls**: Session length adjustment, quiz configuration
- **Real-time Updates**: Supabase Realtime for live member lists

#### Shared Study Sessions
- **Document Sharing**: Host uploads documents for all participants
- **Study Notes**: AI-generated notes visible to all room members
- **Chat System**: Real-time chat for study coordination
- **Progress Tracking**: Live progress bars for all participants

### 3. Gamification System

#### XP & Leveling
- **XP Calculation**: Based on accuracy, speed, difficulty, and streaks
- **Level System**: Every 1000 XP = 1 level
- **Ranking System**: Bronze, Silver, Gold, Platinum, Diamond tiers
- **Achievements**: Perfect scores, win streaks, speed bonuses

#### Progress Tracking
- **Real-time Updates**: Live progress during quizzes
- **Statistics**: Accuracy, win rate, streak tracking
- **Leaderboards**: Global and room-specific rankings
- **Level-up Notifications**: Animated celebrations for achievements

---

## 🔌 API Endpoints

### Study & Quiz APIs

#### `/api/notes` - Study Notes Generation
```typescript
POST /api/notes
Body: FormData {
  files: File[],
  topic: string,
  difficulty: string
}
Response: {
  success: boolean,
  notes: StudyNotes,
  extractedImages: number,
  processedFiles: number
}
```

#### `/api/generate-quiz` - Quiz Generation
```typescript
POST /api/generate-quiz
Body: {
  topic: string,
  difficulty: string,
  studyNotes: StudyNotes,
  userId: string
}
Response: {
  success: boolean,
  questions: QuizQuestion[]
}
```

#### `/api/embeddings` - Vector Embeddings
```typescript
POST /api/embeddings
Body: {
  text: string,
  fileName: string,
  fileType: string,
  userId: string
}
Response: {
  success: boolean,
  chunksProcessed: number,
  metadata: object
}

GET /api/embeddings?q={query}&userId={userId}&limit={limit}&threshold={threshold}
Response: {
  success: boolean,
  results: SearchResult[]
}
```

### Multiplayer APIs

#### `/api/multiplayer-results` - Game Results
```typescript
POST /api/multiplayer-results
Body: {
  roomId: string,
  userId: string,
  results: GameResult
}
Response: {
  success: boolean,
  xpGained: number,
  newLevel: number,
  rank: number
}
```

---

## 📁 File Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── embeddings/           # Vector embeddings
│   │   ├── generate-quiz/        # Quiz generation
│   │   ├── multiplayer-results/  # Game results
│   │   ├── notes/                # Study notes
│   │   └── semantic-search/      # Vector search
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/                # Main dashboard
│   ├── room/[id]/                # Multiplayer rooms
│   ├── singleplayer/             # Singleplayer mode
│   │   ├── quiz/                 # Quiz interface
│   │   └── study-notes/          # Study notes viewer
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── components/                   # React Components
│   ├── dashboard/                # Dashboard components
│   ├── multiplayer/              # Multiplayer features
│   ├── realtime/                 # Real-time components
│   ├── rooms/                    # Room management
│   ├── semantic-search/          # Search components
│   ├── study-notes/              # Study notes UI
│   └── ui/                       # Reusable UI components
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
│   ├── actions/                  # Server actions
│   ├── auth/                     # Authentication
│   ├── schemas/                  # Zod schemas
│   └── supabase/                 # Supabase client
└── middleware.ts                 # Route protection

supabase/
├── setup_fixed.sql               # Main database schema
├── vector_setup.sql              # Vector embeddings setup
└── fix-rls-policies.sql          # RLS policy fixes
```

---

## ⚙️ Setup Instructions

### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/shilojeyaraj/Brain-Battle.git
cd Brain-Battle

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### 2. Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Unsplash (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_key
UNSPLASH_SECRET_KEY=your_unsplash_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup
```sql
-- Run in Supabase SQL Editor
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Run setup_fixed.sql for main schema
-- 3. Run vector_setup.sql for embeddings
-- 4. Run fix-rls-policies.sql for security
```

### 4. Development Server
```bash
npm run dev
# App available at http://localhost:3000
```

---

## 🔄 Development Workflow

### Git Workflow
```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended config
- **Prettier**: Consistent code formatting
- **Component Structure**: Functional components with hooks
- **API Routes**: Server-side validation with Zod schemas

### Testing Strategy
- **Manual Testing**: Singleplayer and multiplayer flows
- **API Testing**: Postman/Thunder Client for endpoints
- **Database Testing**: Direct SQL queries in Supabase
- **Real-time Testing**: Multiple browser tabs for multiplayer

---

## 🐛 Known Issues & Future Work

### Current Limitations
1. **PDF Image Extraction**: Placeholder implementation, needs PyMuPDF
2. **File Size Limits**: No server-side file size validation
3. **Error Handling**: Some API routes lack comprehensive error handling
4. **Mobile Responsiveness**: Some components need mobile optimization
5. **Accessibility**: Missing ARIA labels and keyboard navigation

### Planned Features
1. **Advanced Analytics**: Detailed performance metrics
2. **Study Groups**: Persistent study groups beyond single sessions
3. **Content Library**: Shared document repository
4. **Offline Mode**: Cached quizzes for offline study
5. **Integration**: LMS integration (Canvas, Blackboard)
6. **Advanced AI**: Custom model fine-tuning for specific subjects

### Technical Debt
1. **Code Splitting**: Large components need refactoring
2. **Performance**: Optimize vector search queries
3. **Caching**: Implement Redis for frequently accessed data
4. **Monitoring**: Add error tracking and performance monitoring
5. **Security**: Enhanced input validation and rate limiting

---

## 📊 Performance Metrics

### Current Stats (as of Oct 16, 2024)
- **Total Files**: 80+ source files
- **Lines of Code**: 21,000+ lines
- **API Endpoints**: 6 active endpoints
- **Database Tables**: 8 core tables + vector storage
- **Dependencies**: 25+ production dependencies
- **Build Size**: ~2MB (estimated)

### Performance Targets
- **Page Load**: < 2 seconds
- **Quiz Generation**: < 10 seconds
- **Real-time Updates**: < 500ms latency
- **Vector Search**: < 1 second response time
- **Concurrent Users**: 100+ per room

---

## 🤝 Contributing

### Development Guidelines
1. **Feature Branches**: Always create feature branches
2. **Code Review**: All changes require review
3. **Testing**: Test both singleplayer and multiplayer flows
4. **Documentation**: Update docs for new features
5. **Performance**: Monitor bundle size and API response times

### Team Structure
- **Frontend Development**: React/Next.js components and UI
- **Backend Development**: API routes and database operations
- **AI Integration**: OpenAI API and vector embeddings
- **DevOps**: Deployment and infrastructure management

---

## 📞 Support & Contact

### Documentation
- **API Documentation**: Inline code comments
- **Component Documentation**: JSDoc comments
- **Database Schema**: SQL files in `/supabase`
- **Setup Guides**: README.md and SETUP.md

### Issue Reporting
- **GitHub Issues**: For bugs and feature requests
- **Discord/Slack**: For real-time team communication
- **Email**: For security vulnerabilities

---

*This documentation is maintained by the Brain-Battle development team and updated with each major release.*

