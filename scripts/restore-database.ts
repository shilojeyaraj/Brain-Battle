/**
 * Database Restore Script
 * 
 * This script restores a database backup created by backup-database.ts
 * 
 * Usage:
 *   npx tsx scripts/restore-database.ts <backup-file>
 * 
 * WARNING: This will overwrite existing data!
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (for admin access)
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
 * Restore database from backup file
 */
async function restoreDatabase(backupFile: string) {
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`)
    process.exit(1)
  }

  console.log('📥 Starting database restore...')
  console.log(`   Backup file: ${backupFile}`)

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'))

  if (!backup.metadata || !backup.data) {
    console.error('❌ Invalid backup file format')
    process.exit(1)
  }

  console.log(`   Backup created: ${backup.metadata.timestamp}`)
  console.log(`   Tables in backup: ${backup.metadata.tables}`)

  // Confirm restore
  console.log('\n⚠️  WARNING: This will overwrite existing data!')
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  const tables = Object.keys(backup.data)

  for (const table of tables) {
    try {
      const data = backup.data[table]

      if (data.error) {
        console.warn(`   ⚠️  Skipping ${table}: ${data.error}`)
        continue
      }

      if (!Array.isArray(data)) {
        console.warn(`   ⚠️  Skipping ${table}: Invalid data format`)
        continue
      }

      console.log(`   Restoring table: ${table}...`)

      // Delete existing data (optional - comment out if you want to merge)
      // await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Insert backup data
      if (data.length > 0) {
        // Insert in batches of 100
        const batchSize = 100
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize)
          const { error } = await supabase.from(table).upsert(batch)

          if (error) {
            console.error(`   ❌ Error restoring ${table} (batch ${i / batchSize + 1}):`, error.message)
          } else {
            console.log(`   ✅ Restored ${batch.length} rows to ${table} (batch ${i / batchSize + 1})`)
          }
        }
      } else {
        console.log(`   ℹ️  No data to restore for ${table}`)
      }
    } catch (error) {
      console.error(`   ❌ Failed to restore ${table}:`, error)
    }
  }

  console.log('\n✅ Restore completed')
}

// Get backup file from command line
const backupFile = process.argv[2]

if (!backupFile) {
  console.error('❌ Usage: npx tsx scripts/restore-database.ts <backup-file>')
  process.exit(1)
}

// Resolve backup file path
const resolvedPath = path.isAbsolute(backupFile)
  ? backupFile
  : path.join(process.cwd(), backupFile)

// Run restore
restoreDatabase(resolvedPath)
  .then(() => {
    console.log('\n✅ Restore script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Restore script failed:', error)
    process.exit(1)
  })

