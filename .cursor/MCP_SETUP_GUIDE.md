# MCP Setup Guide - Complete Walkthrough

This guide will walk you through setting up all MCP servers for your Brain-Brawl project.

## 🎯 Quick Start

1. **Run the setup script:**
   ```bash
   node .cursor/setup-mcp.js
   ```

2. **Add missing environment variables to `.env.local`**

3. **Restart Cursor IDE**

## 📋 Step-by-Step Setup

### Step 1: Environment Variables

Add these to your `.env.local` file (create it if it doesn't exist):

```env
# Existing variables (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key

# NEW: Required for Postgres MCP
SUPABASE_DB_PASSWORD=your_database_password

# NEW: Optional MCP API Keys
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token
BRAVE_API_KEY=your_brave_api_key
LINEAR_API_KEY=your_linear_api_key
NOTION_API_KEY=your_notion_api_key
```

### Step 2: Get Your Supabase Database Password

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Find **Database Password** (or reset it if you don't remember)
5. Copy it to `SUPABASE_DB_PASSWORD` in `.env.local`

### Step 3: Build Postgres Connection String

The setup script will automatically build the connection string from your Supabase credentials. 

**Manual method (if needed):**
1. Get your project reference from `NEXT_PUBLIC_SUPABASE_URL`
   - Format: `https://[project-ref].supabase.co`
2. Build connection string:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
3. Add to `.cursor/mcp.json` under `postgres.env.POSTGRES_CONNECTION_STRING`

### Step 4: Verify MCP Packages

Run the verification script:
```bash
node .cursor/setup-mcp.js
```

This will:
- ✅ Check if npx is available
- ✅ Verify all MCP packages can be accessed
- ✅ Update MCP config with environment variables
- ✅ Show setup instructions

### Step 5: Restart Cursor

1. **Close Cursor completely** (not just the window)
2. **Reopen Cursor**
3. **Open your Brain-Brawl project**

### Step 6: Test MCP Servers

In Cursor Chat, try these commands:

```
Use the Filesystem MCP to list files in the src directory
```

```
Use the Git MCP to show the current branch
```

```
Use the Postgres MCP to list all tables in my database
```

```
Use the Memory MCP to store: "This project uses Next.js 15.5.4 with Supabase"
```

## 🔧 Server-Specific Setup

### Essential Servers (No Setup Needed)

These work immediately:
- **Filesystem MCP** - File operations
- **Git MCP** - Version control
- **Memory MCP** - Context storage
- **Fetch MCP** - HTTP requests
- **Sequential Thinking MCP** - Complex reasoning
- **Cursor DB MCP** - Cursor internal database

### Servers Requiring API Keys

#### GitHub MCP
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org`, `read:user`
4. Copy token to `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env.local`

#### Postgres MCP (Supabase)
1. Get database password from Supabase Dashboard
2. Add to `SUPABASE_DB_PASSWORD` in `.env.local`
3. Run `node .cursor/setup-mcp.js` to auto-generate connection string

#### Brave Search MCP
1. Go to https://brave.com/search/api/
2. Sign up and get API key
3. Add to `BRAVE_API_KEY` in `.env.local`

#### Linear MCP
1. Go to Linear Settings → API
2. Create API key
3. Add to `LINEAR_API_KEY` in `.env.local`

#### Notion MCP
1. Go to https://www.notion.so/my-integrations
2. Create new integration
3. Copy API key to `NOTION_API_KEY` in `.env.local`

## 🐛 Troubleshooting

### "Command not found" errors

**Problem:** Cursor can't find npx or Node.js

**Solution:**
1. Make sure Node.js is installed: `node --version`
2. Make sure npx is available: `npx --version`
3. Restart Cursor after installing Node.js

### "Cannot start server" errors

**Problem:** MCP server fails to start

**Solution:**
1. Check `.cursor/mcp.json` syntax (valid JSON)
2. Verify environment variables are set correctly
3. Check Cursor logs: Help → Toggle Developer Tools → Console

### Postgres connection fails

**Problem:** Can't connect to Supabase database

**Solution:**
1. Verify `SUPABASE_DB_PASSWORD` is correct
2. Check connection string format in `mcp.json`
3. Ensure Supabase project is active
4. Try using direct connection string instead of pooler

### MCP servers not appearing

**Problem:** MCP tools don't show up in Cursor Chat

**Solution:**
1. Verify `.cursor/mcp.json` exists and is valid JSON
2. Restart Cursor completely (close all windows)
3. Check Cursor settings: Settings → Features → MCP
4. Look for errors in Cursor logs

## 📝 Configuration File Structure

Your `.cursor/mcp.json` should look like this:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://..."
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token"
      }
    }
    // ... other servers
  }
}
```

## ✅ Verification Checklist

- [ ] `.env.local` exists with all required variables
- [ ] `SUPABASE_DB_PASSWORD` is set
- [ ] `node .cursor/setup-mcp.js` runs without errors
- [ ] `.cursor/mcp.json` has connection strings filled in
- [ ] Cursor has been restarted completely
- [ ] MCP tools appear in Cursor Chat
- [ ] Can use Filesystem MCP successfully
- [ ] Can use Git MCP successfully
- [ ] Can use Postgres MCP (if configured)

## 🚀 Next Steps

Once MCP servers are working:

1. **Explore available tools:** Ask Cursor "What MCP servers are available?"
2. **Use in development:** Leverage MCP tools for database queries, file operations, etc.
3. **Customize:** Add more MCP servers as needed
4. **Share:** Document any custom MCP configurations for your team

## 📚 Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Cursor MCP Guide](https://docs.cursor.com/context/mcp)
- [Supabase Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres)

