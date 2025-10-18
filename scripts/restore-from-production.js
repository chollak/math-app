#!/usr/bin/env node

/**
 * Restore data from production server script
 * Fetches data from production API and populates local database
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const PROD_BASE_URL = 'https://math-app-production.up.railway.app';
const storageConfig = require('../src/config/storage');
const DB_PATH = storageConfig.databasePath;
const UPLOADS_DIR = storageConfig.uploadsPath;

console.log('🚀 Starting data restoration from production...');
console.log(`📍 Database path: ${DB_PATH}`);
console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);

// Ensure directories exist
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Fetch data from production API
function fetchFromProd(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${PROD_BASE_URL}${endpoint}`;
        console.log(`🌐 Fetching: ${url}`);
        
        https.get(url, (response) => {
            let data = '';
            
            response.on('data', chunk => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    console.log(`✅ Fetched ${endpoint}: ${Array.isArray(parsedData) ? parsedData.length : 1} items`);
                    resolve(parsedData);
                } catch (error) {
                    reject(new Error(`Failed to parse JSON from ${endpoint}: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`Request failed for ${endpoint}: ${error.message}`));
        });
    });
}

// Download file from production
function downloadFile(filename, destPath) {
    return new Promise((resolve, reject) => {
        const url = `${PROD_BASE_URL}/api/files/${filename}`;
        const file = fs.createWriteStream(destPath);
        
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode} for ${filename}`));
            }
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Initialize database with production data
function initializeDatabase(questionsData, contextsData) {
    return new Promise((resolve, reject) => {
        console.log('📊 Initializing database with production data...');
        
        // Remove existing database
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
            console.log('🗑️  Removed existing database');
        }
        
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('📁 Connected to new database');
        });

        // Create tables
        const createTables = () => {
            return new Promise((resolveCreate) => {
                const createContextsTable = `
                    CREATE TABLE IF NOT EXISTS contexts (
                        id INTEGER PRIMARY KEY,
                        text TEXT NOT NULL,
                        title TEXT NOT NULL,
                        photos TEXT DEFAULT '[]',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;

                const createQuestionsTable = `
                    CREATE TABLE IF NOT EXISTS questions (
                        id INTEGER PRIMARY KEY,
                        question_ru TEXT,
                        question_kz TEXT,
                        language TEXT DEFAULT 'ru',
                        answer TEXT NOT NULL,
                        level INTEGER,
                        topic TEXT,
                        context_id INTEGER,
                        photos TEXT DEFAULT '[]',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (context_id) REFERENCES contexts (id)
                    )
                `;

                const createAnswerOptionsTable = `
                    CREATE TABLE IF NOT EXISTS answer_options (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        question_id INTEGER NOT NULL,
                        option_letter TEXT NOT NULL,
                        option_text_ru TEXT,
                        option_text_kz TEXT,
                        order_index INTEGER NOT NULL,
                        FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
                    )
                `;

                let completed = 0;
                const checkCompletion = () => {
                    completed++;
                    if (completed === 3) {
                        console.log('✅ Database tables created');
                        resolveCreate();
                    }
                };

                db.run(createContextsTable, checkCompletion);
                db.run(createQuestionsTable, checkCompletion);
                db.run(createAnswerOptionsTable, checkCompletion);
            });
        };

        // Insert contexts
        const insertContexts = () => {
            return new Promise((resolveInsert) => {
                if (contextsData.length === 0) {
                    resolveInsert();
                    return;
                }

                console.log(`📝 Inserting ${contextsData.length} contexts...`);
                const insertContext = db.prepare(`
                    INSERT INTO contexts (id, text, title, photos, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                let completed = 0;
                contextsData.forEach((context) => {
                    const photosJson = JSON.stringify(context.photos || []);
                    
                    insertContext.run([
                        context.id,
                        context.text,
                        context.title,
                        photosJson,
                        context.created_at,
                        context.updated_at
                    ], function(err) {
                        if (err) {
                            console.error('❌ Error inserting context:', err.message);
                        }
                        
                        completed++;
                        if (completed === contextsData.length) {
                            insertContext.finalize();
                            console.log(`✅ Inserted ${completed} contexts`);
                            resolveInsert();
                        }
                    });
                });
            });
        };

        // Insert questions and options
        const insertQuestions = () => {
            return new Promise((resolveInsert) => {
                if (questionsData.length === 0) {
                    resolveInsert();
                    return;
                }

                console.log(`📝 Inserting ${questionsData.length} questions...`);
                const insertQuestion = db.prepare(`
                    INSERT INTO questions (id, question_ru, language, answer, level, topic, context_id, photos, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const insertOption = db.prepare(`
                    INSERT INTO answer_options (question_id, option_letter, option_text_ru, order_index)
                    VALUES (?, ?, ?, ?)
                `);

                let questionsCompleted = 0;
                questionsData.forEach((question) => {
                    const contextId = question.context ? question.context.id : null;
                    const photosJson = JSON.stringify(question.photos || []);
                    
                    insertQuestion.run([
                        question.id,
                        question.question,
                        question.language || 'ru',
                        question.answer,
                        question.level || 4,
                        question.topic || null,
                        contextId,
                        photosJson,
                        question.created_at,
                        question.updated_at
                    ], function(err) {
                        if (err) {
                            console.error('❌ Error inserting question:', err.message);
                            questionsCompleted++;
                            checkQuestionsCompletion();
                            return;
                        }

                        // Insert options
                        if (question.options && Array.isArray(question.options)) {
                            const letters = ['A', 'B', 'C', 'D', 'E'];
                            let optionsCompleted = 0;
                            
                            question.options.forEach((option, optionIndex) => {
                                const letter = letters[optionIndex] || String.fromCharCode(65 + optionIndex);
                                
                                insertOption.run([
                                    question.id,
                                    letter,
                                    option,
                                    optionIndex
                                ], function(err) {
                                    if (err) {
                                        console.error('❌ Error inserting option:', err.message);
                                    }
                                    
                                    optionsCompleted++;
                                    if (optionsCompleted === question.options.length) {
                                        questionsCompleted++;
                                        checkQuestionsCompletion();
                                    }
                                });
                            });
                        } else {
                            questionsCompleted++;
                            checkQuestionsCompletion();
                        }
                    });
                });

                function checkQuestionsCompletion() {
                    if (questionsCompleted === questionsData.length) {
                        insertQuestion.finalize();
                        insertOption.finalize();
                        console.log(`✅ Inserted ${questionsCompleted} questions with options`);
                        resolveInsert();
                    }
                }
            });
        };

        // Execute in sequence
        createTables()
            .then(() => insertContexts())
            .then(() => insertQuestions())
            .then(() => {
                db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err);
                    } else {
                        console.log('✅ Database population completed');
                    }
                    resolve();
                });
            })
            .catch(reject);
    });
}

// Download all images
async function downloadImages(questionsData, contextsData) {
    console.log('📸 Downloading images from production...');
    
    // Collect all unique image filenames
    const allPhotos = new Set();
    
    // From contexts
    contextsData.forEach(context => {
        if (context.photos && Array.isArray(context.photos)) {
            context.photos.forEach(photo => allPhotos.add(photo));
        }
    });
    
    // From questions  
    questionsData.forEach(question => {
        if (question.photos && Array.isArray(question.photos)) {
            question.photos.forEach(photo => allPhotos.add(photo));
        }
    });
    
    console.log(`📊 Found ${allPhotos.size} unique images to download`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const filename of allPhotos) {
        try {
            const destPath = path.join(UPLOADS_DIR, filename);
            await downloadFile(filename, destPath);
            successCount++;
            if (successCount % 5 === 0) {
                console.log(`📥 Downloaded ${successCount}/${allPhotos.size} images...`);
            }
        } catch (error) {
            console.error(`❌ Failed to download ${filename}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`✅ Image download completed: ${successCount} success, ${errorCount} errors`);
}

// Main restoration function
async function restoreFromProduction() {
    try {
        console.log('🌐 Fetching data from production server...');
        
        // Fetch data from production API
        const [questionsData, contextsData] = await Promise.all([
            fetchFromProd('/api/questions'),
            fetchFromProd('/api/contexts')
        ]);
        
        console.log('📊 Data fetched successfully');
        
        // Initialize database
        await initializeDatabase(questionsData, contextsData);
        
        // Download images
        await downloadImages(questionsData, contextsData);
        
        console.log('\n🎉 Restoration completed successfully!');
        console.log('📋 Summary:');
        console.log(`   • Questions: ${questionsData.length}`);
        console.log(`   • Contexts: ${contextsData.length}`);
        console.log(`   • Database: ${DB_PATH}`);
        console.log(`   • Images: ${UPLOADS_DIR}`);
        
    } catch (error) {
        console.error('\n❌ Restoration failed:', error.message);
        process.exit(1);
    }
}

// Run restoration if called directly
if (require.main === module) {
    restoreFromProduction()
        .then(() => {
            console.log('\n✅ All done! Your local instance now matches production.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Fatal error:', error.message);
            process.exit(1);
        });
}

module.exports = { restoreFromProduction };