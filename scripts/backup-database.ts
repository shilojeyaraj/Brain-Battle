/**
 * Database Backup Script
 * 
 * This script creates a backup of your Supabase database
 * 
 * Usage:
 *   npx tsx scripts/backup-database.ts
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (for admin access)
 * 
 * Note: This is a basic backup script. For production, use Supabase's
 * automated backup feature or pg_dump directly.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL:', !!SUPABASE_URL)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * Backup all tables in the database
 */
async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), 'backups')
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`)

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  console.log('📦 Starting database backup...')
  console.log(`   Backup file: ${backupFile}`)

  const tables = [
    'users',
    'profiles',
    'player_stats',
    'rooms',
    'game_rooms',
    'room_members',
    'uploads',
    'documents',
    'units',
    'quiz_sessions',
    'quiz_questions',
    'quiz_answers',
    'questions',
    'player_answers',
    'player_progress',
    'game_results',
    'leaderboard',
    'session_events',
    'document_embeddings',
  ]

  const backup: Record<string, any[]> = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables: tables.length,
    },
    data: {},
  }

  for (const table of tables) {
    try {
      console.log(`   Backing up table: ${table}...`)
      const { data, error } = await supabase.from(table).select('*')

      if (error) {
        console.warn(`   ⚠️  Error backing up ${table}:`, error.message)
        backup.data[table] = { error: error.message }
      } else {
        backup.data[table] = data || []
        console.log(`   ✅ Backed up ${data?.length || 0} rows from ${table}`)
      }
    } catch (error) {
      console.error(`   ❌ Failed to backup ${table}:`, error)
      backup.data[table] = { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Write backup to file
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`\n✅ Backup completed: ${backupFile}`)
  console.log(`   Total size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`)

  // Clean up old backups (keep last 10)
  const backups = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .map((f) => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time)

  if (backups.length > 10) {
    const toDelete = backups.slice(10)
    console.log(`\n🧹 Cleaning up ${toDelete.length} old backup(s)...`)
    for (const backup of toDelete) {
      fs.unlinkSync(backup.path)
      console.log(`   Deleted: ${backup.name}`)
    }
  }

  return backupFile
}

// Run backup
backupDatabase()
  .then((file) => {
    console.log(`\n✅ Backup script completed successfully`)
    console.log(`   Backup saved to: ${file}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Backup script failed:', error)
    process.exit(1)
  })

