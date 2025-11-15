# Cursor MCP Configuration

This directory contains Model Context Protocol (MCP) server configurations for Cursor IDE.

## Setup Instructions

### 1. Configure Environment Variables

Edit `.cursor/mcp.json` and add your API keys and credentials:

- **GitHub**: Add your `GITHUB_PERSONAL_ACCESS_TOKEN` to enable GitHub operations
  - Create token at: https://github.com/settings/tokens
  - Permissions needed: `repo`, `read:org`, `read:user`

- **Postgres**: Add your `POSTGRES_CONNECTION_STRING` for database operations
  - Format: `postgresql://user:password@host:port/database`
  - For Supabase: Use your connection string from Supabase dashboard

- **Brave Search**: Add your `BRAVE_API_KEY` for web search capabilities
  - Get API key at: https://brave.com/search/api/

- **SQLite** (optional): Set `SQLITE_DB_PATH` if using local SQLite databases

### 2. Available MCP Servers

#### 🎯 Most Useful for This Project

**Essential:**
- **Postgres MCP** - Direct database access for Supabase queries
- **Git MCP** - Version control operations
- **Filesystem MCP** - File operations and navigation
- **Memory MCP** - Maintain context across sessions

**Highly Recommended:**
- **GitHub MCP** - Repository management and PRs
- **Fetch MCP** - Test API endpoints and make HTTP requests
- **Sequential Thinking MCP** - Complex problem-solving
- **Cursor DB MCP** - Analyze your Cursor chat history

**Optional but Useful:**
- **Brave Search MCP** - Documentation lookups
- **Playwright/Puppeteer MCP** - E2E testing and automation
- **Notion MCP** - If you use Notion for documentation
- **Linear MCP** - If you use Linear for project management

### 3. Available MCP Servers (Full List)

#### GitHub MCP
- Create/read/update issues and pull requests
- Search repositories and code
- Manage GitHub workflows

#### Filesystem MCP
- Read and write files
- Navigate directory structures
- File operations within project

#### Postgres MCP
- Execute SQL queries
- Database schema inspection
- Data manipulation operations
- **Note**: Use your Supabase connection string

#### Brave Search MCP
- Web search for documentation
- Look up technical information
- Find code examples and solutions

#### SQLite MCP (Optional)
- Local database operations
- Useful for testing and development

#### Puppeteer MCP
- Web scraping and automation
- Screenshot capture
- Browser automation tasks

#### Memory MCP
- Persistent memory storage
- Context retention across sessions
- Useful for maintaining project context

#### Git MCP
- Git operations (commit, push, pull, branch)
- Repository management
- Version control operations

#### Fetch MCP
- HTTP requests and API calls
- Testing endpoints
- Fetching remote resources

#### Sequential Thinking MCP
- Complex reasoning and problem-solving
- Step-by-step analysis
- Multi-step task planning

#### Cursor DB MCP
- Access Cursor's internal databases
- Chat history analysis
- Project insights

#### Playwright MCP
- Advanced browser automation
- E2E testing support
- Alternative to Puppeteer with more features

#### Everart MCP
- AI image generation
- Creative asset creation
- Visual content generation

#### GCP Storage MCP
- Google Cloud Storage operations
- File uploads/downloads
- Cloud storage management

#### AWS S3 MCP
- Amazon S3 operations
- Cloud file storage
- Backup and deployment

#### Slack MCP
- Slack integration
- Team notifications
- Channel management

#### Linear MCP
- Issue tracking integration
- Project management
- Task and bug tracking

#### Notion MCP
- Notion database access
- Documentation integration
- Knowledge base queries

#### Gmail MCP
- Email operations
- Send/receive emails
- Email automation

#### Google Drive MCP
- Google Drive file access
- Document management
- File sharing operations

### 4. Restart Cursor

After configuring, restart Cursor IDE to load the MCP servers.

### 5. Verify Installation

Once restarted, you should see MCP tools available in Cursor's AI chat interface.

## Quick Setup Guide for Key Servers

### Postgres MCP (Supabase)
1. Get your Supabase connection string from: Project Settings → Database → Connection String
2. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
3. Add to `POSTGRES_CONNECTION_STRING` in mcp.json

### GitHub MCP
1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:org`, `read:user`
4. Add token to `GITHUB_PERSONAL_ACCESS_TOKEN`

### Memory MCP
- No setup needed! Automatically stores memory in `.cursor/memory/`
- Add `.cursor/memory/` to `.gitignore` if you don't want to commit memories

### Git MCP
- No API keys needed
- Works with your local Git repository
- Can perform commits, pushes, pulls, branch operations

### Cursor DB MCP
- No setup needed
- Automatically connects to Cursor's internal database
- Useful for analyzing your coding patterns

## Security Notes

- **Never commit API keys** to version control
- Add `.cursor/mcp.json` to `.gitignore` if it contains sensitive data
- Use environment variables for production deployments
- Rotate API keys regularly

## Troubleshooting

- **MCP servers not loading**: Check that all required environment variables are set
- **Connection errors**: Verify API keys and connection strings are correct
- **Permission errors**: Ensure tokens have appropriate scopes/permissions

