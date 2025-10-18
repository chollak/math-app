#!/usr/bin/env node

/**
 * Sync local data to Railway
 * Copy database and uploads using Railway CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const storageConfig = require('../src/config/storage');

console.log('🚀 Syncing local data to Railway...');

// Check if files exist
const dbPath = storageConfig.databasePath;
const uploadsPath = storageConfig.uploadsPath;

console.log(`📍 Database: ${dbPath}`);
console.log(`📁 Uploads: ${uploadsPath}`);

if (!fs.existsSync(dbPath)) {
    console.error('❌ Local database not found!');
    process.exit(1);
}

if (!fs.existsSync(uploadsPath)) {
    console.error('❌ Local uploads directory not found!');
    process.exit(1);
}

try {
    console.log('\n1️⃣  Creating directories on Railway...');
    execSync('railway run "mkdir -p /app/database/uploads"', { stdio: 'inherit' });
    
    console.log('\n2️⃣  Uploading database...');
    const dbSize = fs.statSync(dbPath).size;
    console.log(`📊 Database size: ${(dbSize / 1024).toFixed(2)} KB`);
    
    // Upload database via railway CLI
    execSync(`railway run "cat > /app/database/database.sqlite" < "${dbPath}"`, { stdio: 'inherit' });
    console.log('✅ Database uploaded');
    
    console.log('\n3️⃣  Uploading images...');
    const files = fs.readdirSync(uploadsPath);
    console.log(`📷 Found ${files.length} images to upload`);
    
    let uploadCount = 0;
    for (const file of files) {
        const filePath = path.join(uploadsPath, file);
        const fileSize = fs.statSync(filePath).size;
        
        console.log(`📤 Uploading ${file} (${(fileSize / 1024).toFixed(2)} KB)...`);
        
        try {
            execSync(`railway run "cat > /app/database/uploads/${file}" < "${filePath}"`, { stdio: 'pipe' });
            uploadCount++;
            console.log(`✅ ${file} uploaded`);
        } catch (error) {
            console.error(`❌ Failed to upload ${file}:`, error.message);
        }
    }
    
    console.log(`\n📊 Upload summary:`);
    console.log(`   ✅ Database: uploaded`);
    console.log(`   📷 Images: ${uploadCount}/${files.length} uploaded`);
    
    console.log('\n4️⃣  Verifying upload...');
    try {
        const result = execSync('railway run "ls -la /app/database/"', { encoding: 'utf8' });
        console.log('📁 Railway /app/database/ contents:');
        console.log(result);
        
        const uploadsResult = execSync('railway run "ls -la /app/database/uploads/ | wc -l"', { encoding: 'utf8' });
        const uploadsCount = parseInt(uploadsResult.trim()) - 1; // subtract header line
        console.log(`📷 Uploads directory: ${uploadsCount} files`);
        
    } catch (error) {
        console.log('⚠️  Could not verify upload, but upload likely succeeded');
    }
    
    console.log('\n🎉 Sync completed!');
    console.log('\n🔍 Test your Railway app:');
    console.log('   curl "https://your-domain.railway.app/api/questions" | head -20');
    console.log('   curl "https://your-domain.railway.app/admin/stats?token=your_token"');
    
} catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.log('\n🔄 Alternative methods:');
    console.log('1. Use Railway dashboard to upload files manually');
    console.log('2. Set up FTP/SSH access to Railway');
    console.log('3. Create API endpoints for data upload');
    process.exit(1);
}