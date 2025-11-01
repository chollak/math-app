const path = require('path');
const fs = require('fs');

/**
 * Storage configuration for Docker, server and local environments
 * Manages file paths for database and uploads
 */

// Get base storage path - detects Docker, server, or local environment
function getStorageBasePath() {
  // Priority: 1. Environment variable, 2. Docker path, 3. Server path, 4. Local development path
  if (process.env.STORAGE_BASE_PATH) {
    console.log('🔧 Using environment variable for storage path');
    return process.env.STORAGE_BASE_PATH;
  }
  
  // Docker path (when running in container)
  const dockerPath = '/app/database';
  if (fs.existsSync(dockerPath)) {
    console.log('🐳 Using Docker container storage path');
    return dockerPath;
  }
  
  // Server path (production deployment without Docker)
  const serverPath = path.join(__dirname, '../../data/database');
  if (fs.existsSync(serverPath)) {
    console.log('🖥️  Using server storage path');
    return serverPath;
  }
  
  // Default local development path
  const localPath = path.join(__dirname, '../../database');
  console.log('💻 Using local development storage path');
  return localPath;
}

const storageBasePath = getStorageBasePath();

// Configure paths
const config = {
  // Base storage directory (docker: /app/database/, server: data/database/, local: database/)
  basePath: storageBasePath,
  
  // Database file path
  databasePath: path.join(storageBasePath, 'database.sqlite'),
  
  // Uploads directory (inside storage directory)
  uploadsPath: path.join(storageBasePath, 'uploads'),
  
  // Public images path (for web access)
  publicImagesPath: path.join(__dirname, '../../public/images'),
  
  // Temporary directory
  tempPath: path.join(__dirname, '../../temp'),
};

// Ensure all directories exist
function ensureDirectoriesExist() {
  const directories = [
    config.basePath,
    config.uploadsPath,
    config.publicImagesPath,
    config.tempPath
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Initialize storage
ensureDirectoriesExist();

console.log(`📦 Storage configuration:`);
console.log(`   Base path: ${config.basePath}`);
console.log(`   Database: ${config.databasePath}`);
console.log(`   Uploads: ${config.uploadsPath}`);
console.log(`   Public images: ${config.publicImagesPath}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

module.exports = config;