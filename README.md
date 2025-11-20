# Brain Battle 🧠⚡

**An AI-Powered Multiplayer Study Platform**

Brain Battle is a cutting-edge educational platform that combines artificial intelligence, real-time multiplayer functionality, and gamification to create an engaging study experience. Students can upload their study materials, generate comprehensive study notes and quizzes using AI, and compete with friends in real-time multiplayer sessions.

![Brain Battle Logo](https://img.shields.io/badge/Brain%20Battle-AI%20Powered%20Learning-blue?style=for-the-badge&logo=brain&logoColor=white)

## 🌟 Key Features

### 🎯 **AI-Powered Study Generation**
- **Smart Document Analysis**: Upload PDFs, documents, and study materials
- **Comprehensive Study Notes**: AI generates detailed notes with key concepts, definitions, and examples
- **Intelligent Question Generation**: Create quiz questions based on actual document content
- **Semantic Search**: Vector embeddings for contextually relevant content retrieval
- **Visual Enhancement**: Automatic image integration for better learning

### 🏆 **Multiplayer Competition**
- **Private Study Rooms**: Create or join rooms with unique 6-character codes
- **Real-time Progress Tracking**: Live leaderboards and synchronized quiz sessions
- **Study Session Mode**: Collaborative study time before competitive quizzes
- **Live Member Updates**: Real-time notifications when members join/leave
- **Host Controls**: Configurable study session duration and settings

### 🎮 **Gamification System**
- **Advanced XP System**: Detailed scoring based on accuracy, speed, and difficulty
- **Level Progression**: 20+ levels with unique rank names and icons
- **Performance Analytics**: Comprehensive statistics and progress tracking
- **Achievement System**: Badges and rewards for milestones
- **Leaderboards**: Global and room-specific rankings

### 🛡️ **Anti-Cheat Technology**
- **Real-time Monitoring**: Tab switching and focus detection
- **Violation Reporting**: Automatic cheat event logging and reporting
- **Fair Play Enforcement**: Ensures competitive integrity
- **Host Notifications**: Real-time alerts for suspicious activity

## 📚 Documentation

All project documentation has been organized into the `docs/` directory:

- **[Documentation Index](./docs/README.md)** - Complete documentation index
- **[Setup Guide](./docs/setup/SETUP.md)** - Initial setup instructions
- **[Complete Technical Docs](./DOCUMENTATION.md)** - Comprehensive technical documentation
- **[Authentication](./docs/authentication/)** - Auth system documentation
- **[Stripe Integration](./docs/stripe/)** - Payment and subscription docs
- **[Production Guide](./docs/production/)** - Deployment and production docs

## 🚀 Tech Stack

### **Frontend**
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect, useCallback, useMemo)

### **Backend**
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **Authentication**: Custom authentication system with bcrypt
- **Real-time**: Supabase Realtime subscriptions
- **File Storage**: Supabase Storage
- **API**: Next.js API routes with TypeScript

### **AI & Machine Learning**
- **Language Model**: OpenAI GPT-4o
- **Vector Embeddings**: OpenAI text-embedding-3-small
- **Document Processing**: pdf-parse for PDF text extraction
- **Image Integration**: Unsplash API for educational visuals

### **Development Tools**
- **Linting**: ESLint with Next.js configuration
- **Type Checking**: TypeScript strict mode
- **Code Formatting**: Prettier (via ESLint)
- **Version Control**: Git with GitHub

## 🏗️ Architecture

### **Database Schema**
- **12 Core Tables**: Users, player stats, game rooms, quiz sessions, questions, answers, results, leaderboard
- **Real-time Subscriptions**: Live updates for member lists, progress tracking, and cheat events
- **Vector Storage**: Document embeddings for semantic search
- **Row Level Security**: Comprehensive RLS policies for data protection

### **API Architecture**
- **8 RESTful Endpoints**: Complete CRUD operations for all features
- **Error Handling**: Comprehensive error responses with proper HTTP status codes
- **Rate Limiting**: Built-in protection against abuse
- **Type Safety**: Full TypeScript integration throughout

### **Component Architecture**
- **Modular Design**: Reusable UI components with Radix UI
- **Performance Optimized**: React.memo, useCallback, and useMemo for optimal rendering
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG compliant with proper ARIA labels

## 🎯 Unique Implementations

### **1. AI-Powered Content Analysis**
```typescript
// Intelligent document analysis with complexity detection
const complexityAnalysis = {
  vocabulary_level: "intermediate",
  concept_sophistication: "abstract", 
  reasoning_level: "application",
  prerequisite_knowledge: ["Basic Chemistry", "Mathematics"]
}
```

### **2. Real-time Multiplayer Synchronization**
- **WebSocket Integration**: Supabase Realtime for instant updates
- **State Synchronization**: Shared quiz state across all participants
- **Conflict Resolution**: Automatic handling of concurrent actions
- **Offline Resilience**: Graceful handling of connection issues

### **3. Advanced Scoring Algorithm**
```typescript
// Multi-factor XP calculation
const xpEarned = Math.round(
  (baseXP * difficultyMultiplier * speedBonus * accuracyBonus) + 
  perfectScoreBonus + streakBonus
)
```

### **4. Vector-Based Semantic Search**
- **Document Chunking**: Intelligent text segmentation
- **Embedding Generation**: OpenAI text-embedding-3-small
- **Similarity Search**: Cosine similarity for content retrieval
- **Context Preservation**: Maintains document structure and relationships

### **5. Anti-Cheat Detection System**
- **Focus Monitoring**: Detects tab switching and window focus loss
- **Timing Analysis**: Identifies suspicious response patterns
- **Real-time Reporting**: Instant violation logging and notifications
- **Machine Learning**: Pattern recognition for advanced detection

## 📊 Performance Optimizations

### **Frontend Optimizations**
- **Code Splitting**: Dynamic imports for route-based splitting
- **Image Optimization**: Next.js Image component with lazy loading
- **Bundle Analysis**: Optimized bundle size with tree shaking
- **Caching Strategy**: Intelligent caching for API responses

### **Backend Optimizations**
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: N+1 query prevention and efficient joins
- **Caching Layer**: Redis-like caching for frequently accessed data

### **Real-time Optimizations**
- **Selective Subscriptions**: Only subscribe to relevant data changes
- **Debounced Updates**: Prevents excessive re-renders
- **Connection Management**: Automatic reconnection and cleanup
- **Bandwidth Optimization**: Minimal data transfer for updates

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- Supabase account
- OpenAI API key

### **Installation**

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/brain-battle.git
cd brain-battle
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.local.example .env.local
```

4. **Configure your environment variables in `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

5. **Set up the database:**
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Run the SQL from `supabase/setup.sql` to create all tables and policies

6. **Start the development server:**
```bash
npm run dev
```

7. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## 🎮 How It Works

### **Singleplayer Mode**
1. **Upload Documents**: Upload PDFs, documents, or study materials
2. **AI Analysis**: AI analyzes content and generates comprehensive study notes
3. **Quiz Generation**: Create quiz questions based on actual document content
4. **Take Quiz**: Answer questions with real-time scoring and feedback
5. **Progress Tracking**: View detailed statistics and XP breakdowns

### **Multiplayer Mode**
1. **Create/Join Room**: Create a room or join with a unique code
2. **Upload Materials**: All members upload their study materials
3. **Study Session**: Optional collaborative study time with shared notes
4. **Quiz Competition**: Real-time competitive quiz with live progress tracking
5. **Results & Rankings**: View final scores and leaderboard updates

## 🔧 Development

### **Project Structure**
```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── room/              # Multiplayer room pages
│   └── singleplayer/      # Singleplayer pages
├── components/            # Reusable UI components
│   ├── dashboard/         # Dashboard-specific components
│   ├── multiplayer/       # Multiplayer components
│   ├── study-notes/       # Study notes components
│   └── ui/                # Base UI components
├── lib/                   # Utility functions and configurations
│   ├── supabase/          # Supabase client setup
│   ├── auth/              # Authentication utilities
│   └── utils/             # Helper functions
└── hooks/                 # Custom React hooks
```

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run clean        # Clean build artifacts
npm run dev:clean    # Clean and start dev server
npm run build:clean  # Clean and build
```

## 🎯 Benefits

### **For Students**
- **Personalized Learning**: AI-generated content tailored to your materials
- **Competitive Motivation**: Gamification encourages consistent study habits
- **Social Learning**: Study with friends in real-time
- **Comprehensive Analytics**: Track progress and identify areas for improvement
- **Flexible Study Modes**: Choose between solo study or group competition

### **For Educators**
- **Content Creation**: Generate study materials from any document
- **Student Engagement**: Gamified learning increases participation
- **Progress Monitoring**: Real-time insights into student performance
- **Flexible Assessment**: Create quizzes from any educational content
- **Collaborative Learning**: Foster peer-to-peer learning experiences

### **For Institutions**
- **Scalable Platform**: Supports unlimited users and content
- **Data Analytics**: Comprehensive reporting and insights
- **Integration Ready**: Easy integration with existing LMS systems
- **Cost Effective**: Reduces need for manual content creation
- **Modern Technology**: Built with latest web technologies

## 🔮 Future Roadmap

### **Phase 1: Enhanced AI Features**
- [ ] Multi-language support for international students
- [ ] Advanced image analysis and diagram recognition
- [ ] Voice-to-text integration for accessibility
- [ ] Personalized learning recommendations

### **Phase 2: Advanced Multiplayer**
- [ ] Tournament mode with brackets
- [ ] Team-based competitions
- [ ] Custom game modes and rules
- [ ] Spectator mode for observers

### **Phase 3: Institutional Features**
- [ ] Teacher dashboard and analytics
- [ ] Assignment creation and management
- [ ] Gradebook integration
- [ ] Institutional reporting

### **Phase 4: Mobile & Accessibility**
- [ ] Native mobile applications
- [ ] Offline mode support
- [ ] Advanced accessibility features
- [ ] Cross-platform synchronization

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Guidelines**
1. **Feature Branches**: Always create feature branches
2. **Code Review**: All changes require review
3. **Testing**: Test both singleplayer and multiplayer flows
4. **Documentation**: Update docs for new features
5. **Performance**: Monitor bundle size and API response times

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the AI capabilities
- **Supabase** for the backend infrastructure
- **Vercel** for the deployment platform
- **Radix UI** for the accessible component primitives
- **Tailwind CSS** for the utility-first styling approach

## 📞 Support

- **Documentation**: [Full Documentation](DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/brain-battle/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/brain-battle/discussions)
- **Email**: support@brainbattle.app

---

**Built with ❤️ by the Brain Battle Team**

*Transforming education through AI-powered competitive learning*