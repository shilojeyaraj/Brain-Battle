#!/usr/bin/env node
/**
 * MCP Setup and Verification Script
 * Run: npm run mcp:setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MCP_CONFIG_PATH = path.join(__dirname, 'mcp.json');
const ENV_LOCAL_PATH = path.join(__dirname, '..', '.env.local');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readEnvFile() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    return {};
  }
  const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  return env;
}

function buildPostgresConnectionString(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return null;
  
  const projectRef = match[1];
  const password = env.SUPABASE_DB_PASSWORD;
  
  if (!password) return null;
  
  return `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
}

function updateMCPConfig(env) {
  log('\n📝 Updating MCP configuration...', 'cyan');
  
  if (!fs.existsSync(MCP_CONFIG_PATH)) {
    log('❌ MCP config file not found!', 'red');
    return false;
  }
  
  const config = JSON.parse(fs.readFileSync(MCP_CONFIG_PATH, 'utf-8'));
  let updated = false;
  
  if (config.mcpServers.postgres) {
    const connString = buildPostgresConnectionString(env);
    if (connString) {
      config.mcpServers.postgres.env.POSTGRES_CONNECTION_STRING = connString;
      updated = true;
      log('✅ Updated Postgres connection string', 'green');
    } else {
      log('⚠️  Postgres: Add SUPABASE_DB_PASSWORD to .env.local', 'yellow');
    }
  }
  
  const tokenMappings = {
    GITHUB_PERSONAL_ACCESS_TOKEN: 'github',
    BRAVE_API_KEY: 'brave-search',
    LINEAR_API_KEY: 'linear',
    NOTION_API_KEY: 'notion',
  };
  
  Object.entries(tokenMappings).forEach(([envKey, serverKey]) => {
    if (config.mcpServers[serverKey] && env[envKey]) {
      config.mcpServers[serverKey].env[envKey] = env[envKey];
      updated = true;
      log(`✅ Updated ${serverKey} API key`, 'green');
    }
  });
  
  if (updated) {
    fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
    log('\n✅ MCP configuration updated!', 'green');
  } else {
    log('\nℹ️  No updates needed', 'blue');
  }
  
  return true;
}

function main() {
  log('🚀 MCP Setup Script', 'cyan');
  log('='.repeat(50), 'cyan');
  
  const env = readEnvFile();
  
  updateMCPConfig(env);
  
  log('\n📋 Next Steps:', 'yellow');
  log('1. Add SUPABASE_DB_PASSWORD to .env.local (if missing)', 'cyan');
  log('2. Restart Cursor IDE completely', 'cyan');
  log('3. Test in Cursor Chat: "Use Filesystem MCP to list files"', 'cyan');
  log('\n✅ Setup complete!', 'green');
}

if (require.main === module) {
  main();
}

module.exports = { main, updateMCPConfig };

