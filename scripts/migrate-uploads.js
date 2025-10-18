#!/usr/bin/env node

/**
 * Migrate existing uploads to volume structure
 * Moves files from ./uploads to ./database/uploads
 */

const fs = require('fs');
const path = require('path');
const storageConfig = require('../src/config/storage');

console.log('📦 Migrating uploads to volume structure...');

const oldUploadsPath = path.join(__dirname, '../uploads');
const newUploadsPath = storageConfig.uploadsPath;

console.log(`📂 Old path: ${oldUploadsPath}`);
console.log(`📁 New path: ${newUploadsPath}`);

// Check if old uploads directory exists
if (!fs.existsSync(oldUploadsPath)) {
  console.log('✅ No old uploads directory found - nothing to migrate');
  process.exit(0);
}

// Ensure new uploads directory exists
if (!fs.existsSync(newUploadsPath)) {
  fs.mkdirSync(newUploadsPath, { recursive: true });
  console.log(`📁 Created new uploads directory: ${newUploadsPath}`);
}

// Get list of files in old directory
const files = fs.readdirSync(oldUploadsPath);

if (files.length === 0) {
  console.log('✅ No files to migrate');
  process.exit(0);
}

console.log(`📋 Found ${files.length} files to migrate:`);

let successCount = 0;
let errorCount = 0;

// Move each file
files.forEach(filename => {
  try {
    const oldFilePath = path.join(oldUploadsPath, filename);
    const newFilePath = path.join(newUploadsPath, filename);
    
    // Skip if file already exists in new location
    if (fs.existsSync(newFilePath)) {
      console.log(`⏭️  Skipped ${filename} (already exists)`);
      return;
    }
    
    // Copy file to new location
    fs.copyFileSync(oldFilePath, newFilePath);
    console.log(`✅ Moved: ${filename}`);
    successCount++;
    
  } catch (error) {
    console.error(`❌ Error moving ${filename}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Migration summary:`);
console.log(`   ✅ Success: ${successCount} files`);
console.log(`   ❌ Errors: ${errorCount} files`);

// Also copy to public/images for web access
const publicImagesPath = storageConfig.publicImagesPath;
console.log(`\n📋 Also copying to public/images for web access...`);

let publicCopyCount = 0;
files.forEach(filename => {
  try {
    const sourcePath = path.join(newUploadsPath, filename);
    const publicPath = path.join(publicImagesPath, filename);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, publicPath);
      publicCopyCount++;
    }
  } catch (error) {
    console.error(`❌ Error copying ${filename} to public:`, error.message);
  }
});

console.log(`✅ Copied ${publicCopyCount} files to public/images`);

if (successCount > 0) {
  console.log(`\n🗑️  You can now safely delete the old uploads directory:`);
  console.log(`   rm -rf ${oldUploadsPath}`);
}

console.log(`\n🎉 Migration completed!`);
console.log(`📁 Files are now in: ${newUploadsPath}`);
console.log(`🌐 Web access via: ${publicImagesPath}`);