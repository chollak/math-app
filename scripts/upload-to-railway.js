#!/usr/bin/env node

/**
 * Upload local data to Railway production server
 * Exports local database and uploads files to Railway
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');
const { exportDatabase } = require('./export-database');
const storageConfig = require('../src/config/storage');

// Configuration
const RAILWAY_URL = process.env.RAILWAY_URL || 'https://your-railway-domain.railway.app';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your_admin_token';

console.log('🚀 Uploading local data to Railway...');
console.log(`🎯 Target: ${RAILWAY_URL}`);

// Create a zip archive of uploads
function createUploadsZip() {
    return new Promise((resolve, reject) => {
        const archiver = require('archiver');
        const uploadsPath = storageConfig.uploadsPath;
        const zipPath = path.join(storageConfig.tempPath, 'uploads.zip');
        
        if (!fs.existsSync(uploadsPath)) {
            console.log('📁 No uploads directory found');
            resolve(null);
            return;
        }

        const files = fs.readdirSync(uploadsPath);
        if (files.length === 0) {
            console.log('📁 No files in uploads directory');
            resolve(null);
            return;
        }

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`📦 Created uploads.zip: ${archive.pointer()} bytes`);
            resolve(zipPath);
        });

        archive.on('error', reject);
        archive.pipe(output);
        
        // Add all files from uploads directory
        files.forEach(file => {
            const filePath = path.join(uploadsPath, file);
            archive.file(filePath, { name: file });
        });
        
        archive.finalize();
    });
}

// Upload data via admin API
function uploadToRailway(sqlPath, zipPath) {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        
        // Add SQL dump
        if (fs.existsSync(sqlPath)) {
            form.append('database', fs.createReadStream(sqlPath), {
                filename: 'database.sql',
                contentType: 'application/sql'
            });
        }
        
        // Add uploads zip
        if (zipPath && fs.existsSync(zipPath)) {
            form.append('uploads', fs.createReadStream(zipPath), {
                filename: 'uploads.zip',
                contentType: 'application/zip'
            });
        }

        const url = new URL('/admin/restore', RAILWAY_URL);
        url.searchParams.set('token', ADMIN_TOKEN);

        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: form.getHeaders()
        };

        console.log(`📤 Uploading to: ${url.toString()}`);

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Upload completed successfully');
                    try {
                        const response = JSON.parse(data);
                        console.log('📊 Response:', response);
                        resolve(response);
                    } catch (e) {
                        resolve({ success: true, message: data });
                    }
                } else {
                    console.error(`❌ Upload failed: HTTP ${res.statusCode}`);
                    console.error('Response:', data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        form.pipe(req);
    });
}

// Alternative: Upload via multiple API calls
async function uploadViaAPI() {
    console.log('📊 Uploading data via API calls...');
    
    try {
        // Get local data
        const localQuestions = JSON.parse(fs.readFileSync('questions_local.json', 'utf8'));
        const localContexts = JSON.parse(fs.readFileSync('contexts_local.json', 'utf8'));
        
        console.log(`📋 Found ${localQuestions.length} questions and ${localContexts.length} contexts`);
        
        // Upload contexts first
        for (const context of localContexts) {
            await uploadContext(context);
        }
        
        // Upload questions
        for (const question of localQuestions) {
            await uploadQuestion(question);
        }
        
        console.log('✅ API upload completed');
        
    } catch (error) {
        console.error('❌ API upload failed:', error.message);
        throw error;
    }
}

// Helper functions for API upload
function uploadContext(context) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(context);
        const url = new URL('/api/contexts', RAILWAY_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 201) {
                resolve();
            } else {
                reject(new Error(`Failed to upload context ${context.id}`));
            }
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function uploadQuestion(question) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(question);
        const url = new URL('/api/questions', RAILWAY_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 201) {
                resolve();
            } else {
                reject(new Error(`Failed to upload question ${question.id}`));
            }
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Export local data to JSON files
async function exportLocalData() {
    console.log('📦 Exporting local data...');
    
    const http = require('http');
    
    // Get data from local server
    const questions = await fetchLocalData('http://localhost:3000/api/questions');
    const contexts = await fetchLocalData('http://localhost:3000/api/contexts');
    
    // Save to files
    fs.writeFileSync('questions_local.json', JSON.stringify(questions, null, 2));
    fs.writeFileSync('contexts_local.json', JSON.stringify(contexts, null, 2));
    
    console.log(`✅ Exported ${questions.length} questions and ${contexts.length} contexts`);
}

function fetchLocalData(url) {
    return new Promise((resolve, reject) => {
        const http = require('http');
        
        http.get(url, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Main upload function
async function uploadToRailwayMain() {
    try {
        console.log('🚀 Starting upload process...');
        
        // Export local database
        console.log('📊 Exporting local database...');
        const sqlPath = path.join(storageConfig.tempPath, 'local-export.sql');
        await exportDatabase(sqlPath);
        
        // Create uploads zip
        console.log('📦 Creating uploads archive...');
        const zipPath = await createUploadsZip();
        
        // Upload to Railway
        console.log('📤 Uploading to Railway...');
        await uploadToRailway(sqlPath, zipPath);
        
        // Cleanup
        if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
        if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        
        console.log('🎉 Upload completed successfully!');
        
    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        
        // Try alternative method
        console.log('🔄 Trying alternative upload method...');
        try {
            await exportLocalData();
            await uploadViaAPI();
        } catch (altError) {
            console.error('❌ Alternative upload also failed:', altError.message);
            process.exit(1);
        }
    }
}

// Run upload if called directly
if (require.main === module) {
    const railwayUrl = process.argv[2];
    const adminToken = process.argv[3];
    
    if (railwayUrl) {
        process.env.RAILWAY_URL = railwayUrl;
    }
    if (adminToken) {
        process.env.ADMIN_TOKEN = adminToken;
    }
    
    if (!process.env.RAILWAY_URL || process.env.RAILWAY_URL === 'https://your-railway-domain.railway.app') {
        console.error('❌ Please provide Railway URL:');
        console.error('Usage: node upload-to-railway.js https://your-domain.railway.app your_admin_token');
        process.exit(1);
    }
    
    uploadToRailwayMain()
        .then(() => {
            console.log('\n✅ All done! Your Railway instance now has your local data.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Fatal error:', error.message);
            process.exit(1);
        });
}

module.exports = { uploadToRailwayMain };