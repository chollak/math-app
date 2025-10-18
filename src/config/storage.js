const path = require('path');
const fs = require('fs');

/**
 * Storage configuration for Railway volume support
 * Manages file paths for database and uploads
 */

// Get base storage path - same as database directory
function getStorageBasePath() {
  // Priority: 1. Environment variable, 2. Railway volume, 3. Default local path
  if (process.env.STORAGE_BASE_PATH) {
    return process.env.STORAGE_BASE_PATH;
  }
  
  // Railway volume path (when volume is mounted)
  const railwayVolumePath = '/app/database';
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return process.env.RAILWAY_VOLUME_MOUNT_PATH;
  }
  
  // Check if we're in Railway environment and volume exists
  if (process.env.RAILWAY_ENVIRONMENT && fs.existsSync('/app/database')) {
    console.log('🚂 Railway volume detected for storage');
    return railwayVolumePath;
  }
  
  // Default local development path
  const defaultPath = path.join(__dirname, '../../database');
  console.log('💻 Using local development storage path');
  return defaultPath;
}

const storageBasePath = getStorageBasePath();

// Configure paths
const config = {
  // Base storage directory (where volume is mounted)
  basePath: storageBasePath,
  
  // Database file path
  databasePath: path.join(storageBasePath, 'database.sqlite'),
  
  // Uploads directory (inside volume)
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
console.log(`   Railway: ${process.env.RAILWAY_ENVIRONMENT ? 'Yes' : 'No'}`);

module.exports = config;