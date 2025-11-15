# MCP Quick Start Guide

## ✅ What's Already Done

1. ✅ MCP configuration file created (`.cursor/mcp.json`)
2. ✅ 20+ MCP servers configured
3. ✅ Setup script created (`npm run mcp:setup`)
4. ✅ Documentation created
5. ✅ `.gitignore` updated

## 🚀 Quick Setup (3 Steps)

### Step 1: Add Database Password

Add to your `.env.local` file:
```env
SUPABASE_DB_PASSWORD=your_database_password_here
```

**Where to find it:**
- Supabase Dashboard → Settings → Database → Database Password

### Step 2: Run Setup Script

```bash
npm run mcp:setup
```

This will automatically:
- Read your environment variables
- Build the Postgres connection string
- Update MCP configuration

### Step 3: Restart Cursor

1. **Close Cursor completely** (all windows)
2. **Reopen Cursor**
3. **Open your Brain-Brawl project**

## 🧪 Test It Works

In Cursor Chat, try:

```
Use the Filesystem MCP to list files in the src directory
```

```
Use the Git MCP to show the current branch
```

```
Use the Postgres MCP to list all tables in my database
```

## 📚 More Information

- **Full Setup Guide:** `.cursor/MCP_SETUP_GUIDE.md`
- **MCP Documentation:** `.cursor/README.md`
- **Project Rules:** `.cursorrules`

## 🎯 Most Useful MCPs for This Project

**Ready to use (no setup):**
- Filesystem MCP - File operations
- Git MCP - Version control
- Memory MCP - Context storage
- Fetch MCP - HTTP requests
- Sequential Thinking MCP - Complex reasoning

**Requires API keys:**
- Postgres MCP - Database queries (needs SUPABASE_DB_PASSWORD)
- GitHub MCP - Repository management (optional)
- Brave Search MCP - Web search (optional)

## 🐛 Troubleshooting

**MCP servers not appearing?**
1. Check `.cursor/mcp.json` exists and is valid JSON
2. Restart Cursor completely
3. Check Cursor logs: Help → Toggle Developer Tools

**Postgres connection fails?**
1. Verify `SUPABASE_DB_PASSWORD` is correct
2. Run `npm run mcp:setup` again
3. Check connection string in `.cursor/mcp.json`

## 💡 Pro Tips

- Use Memory MCP to store project context across sessions
- Use Sequential Thinking MCP for complex problem-solving
- Use Postgres MCP to query your Supabase database directly
- Use Git MCP for version control operations

