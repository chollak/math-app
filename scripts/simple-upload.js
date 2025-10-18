#!/usr/bin/env node

/**
 * Simple upload of local data to Railway
 * Uses direct database copy via Railway CLI
 */

console.log('📋 Simple method to upload local data to Railway:\n');

console.log('1️⃣  Export your local database:');
console.log('   npm run export-db\n');

console.log('2️⃣  Copy database file to Railway:');
console.log('   railway run "mkdir -p /app/database"');
console.log('   railway run "cat > /app/database/database.sqlite" < database/database.sqlite\n');

console.log('3️⃣  Copy uploads directory:');
console.log('   railway run "mkdir -p /app/database/uploads"');
console.log('   for file in database/uploads/*; do');
console.log('     echo "Uploading $(basename $file)..."');
console.log('     railway run "cat > /app/database/uploads/$(basename $file)" < "$file"');
console.log('   done\n');

console.log('4️⃣  Or use this automated script:');
console.log('   node scripts/railway-sync.js\n');

console.log('🎯 Your Railway URL: https://your-domain.railway.app');
console.log('🔑 Admin token needed for verification');