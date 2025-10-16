# Brain Brawl 🧠⚡

A real-time multiplayer study app where friends can compete in AI-generated quizzes based on their uploaded study materials.

## Features

- **Private Study Rooms**: Create or join rooms with unique codes
- **Document Upload**: Upload PDFs, documents, and study materials
- **AI Question Generation**: Automatically generate quiz questions from your content
- **Real-time Competition**: See everyone's progress live as they answer questions
- **Multiplayer Support**: Compete with friends in the same room
- **Progress Tracking**: Live leaderboards and progress bars

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **UI Components**: Radix UI, Lucide React
- **AI**: OpenAI API for question generation
- **File Processing**: PDF parsing and text extraction

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account
- An OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd brain-brawl
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

5. Set up the database:
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Run the SQL from `supabase/schema.sql` to create all tables and policies

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

The app uses the following main tables:
- `profiles` - User profile information
- `rooms` - Study room data with unique codes
- `room_members` - Room membership and roles
- `uploads` - Uploaded study materials metadata
- `units` - Topic/unit selections for quizzes
- `quiz_sessions` - Quiz session lifecycle
- `quiz_questions` - Generated question bank
- `quiz_answers` - User answers and scoring
- `player_progress` - Real-time progress tracking

## How It Works

1. **Create/Join Room**: Users create a room or join with a code
2. **Upload Materials**: Upload PDFs, documents, or study materials
3. **Select Topics**: Choose what specific topics to be quizzed on
4. **AI Generation**: AI analyzes content and generates quiz questions
5. **Real-time Quiz**: All players answer questions simultaneously
6. **Live Progress**: See everyone's progress and who's winning
7. **Winner Declaration**: First to complete or highest score wins!

## Development

### Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── room/              # Room management pages
│   └── ...
├── lib/                   # Utility functions and configurations
│   ├── supabase/          # Supabase client setup
│   └── utils.ts           # Helper functions
└── components/            # Reusable UI components
```

### Key Features Implemented

- ✅ User authentication (login/signup)
- ✅ Room creation and joining with codes
- ✅ Basic room management interface
- ✅ Database schema with RLS policies
- ✅ Responsive UI with modern design

### Next Steps

- [ ] File upload system with Supabase Storage
- [ ] PDF text extraction and processing
- [ ] AI question generation integration
- [ ] Real-time progress tracking
- [ ] Quiz interface and game logic
- [ ] Advanced UI components and animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details