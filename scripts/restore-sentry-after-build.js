// Script to restore Sentry config files after build
const fs = require('fs')
const path = require('path')

const sentryFiles = [
  'sentry.server.config.ts',
  'sentry.client.config.ts',
  'sentry.edge.config.ts'
]

const backupSuffix = '.build-bak'

console.log('🔧 Restoring Sentry config files after build...')

// Restore Sentry config files
sentryFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  const backupPath = filePath + backupSuffix
  
  if (fs.existsSync(backupPath)) {
    fs.renameSync(backupPath, filePath)
    console.log(`  ✅ Restored ${file}`)
  }
})

console.log('✅ Sentry config files restored.')

