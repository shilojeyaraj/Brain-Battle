// Script to temporarily disable Sentry during build to prevent Html import errors
// This is needed because Sentry's Next.js integration imports Html from next/document
// which breaks prerendering of error pages

const fs = require('fs')
const path = require('path')

const sentryFiles = [
  'sentry.server.config.ts',
  'sentry.client.config.ts',
  'sentry.edge.config.ts'
]

const backupSuffix = '.build-bak'

console.log('🔧 Temporarily disabling Sentry config files for build...')

// Rename Sentry config files to disable them during build
sentryFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  const backupPath = filePath + backupSuffix
  
  if (fs.existsSync(filePath)) {
    fs.renameSync(filePath, backupPath)
    console.log(`  ✅ Renamed ${file} → ${file}${backupSuffix}`)
  }
})

console.log('✅ Sentry disabled for build. Config files will be restored after build completes.')
console.log('⚠️  Note: If build fails, manually restore files by removing .build-bak suffix')

