# Brain Brawl Setup Guide

## Quick Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `brain-brawl` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for the project to be set up (usually 1-2 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)
   - **service_role** key (starts with `eyJ`) - **Keep this secret!**

### 3. Set Up Your Environment Variables

Create a file called `.env.local` in your project root with this content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI API Key (optional for now)
OPENAI_API_KEY=your_openai_api_key_here
```

**Replace the values with your actual Supabase credentials!**

### 4. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Click "Run" to execute the SQL
5. You should see "Success. No rows returned" - this means it worked!

### 5. Test the Application

1. Stop the development server (Ctrl+C)
2. Start it again: `npm run dev`
3. Open [http://localhost:3001](http://localhost:3001) (or whatever port it shows)
4. You should see the Brain Brawl homepage!

## Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure your `.env.local` file is in the project root (same level as `package.json`)
- Check that the variable names are exactly as shown above
- Restart the development server after creating the file

### "Room not found" Error
- Make sure you ran the SQL schema in Supabase
- Check that your environment variables are correct

### Port Already in Use
- The app will automatically use the next available port (3001, 3002, etc.)
- Check the terminal output for the correct URL

## Next Steps

Once you have the basic setup working:
1. Create an account (sign up)
2. Create a room
3. Test joining rooms with codes
4. We can then add file upload and AI features!

## Need Help?

If you're stuck, check:
1. Your `.env.local` file exists and has the correct values
2. The SQL schema was run successfully in Supabase
3. Your Supabase project is active (not paused)
4. You're using the correct port shown in the terminal
