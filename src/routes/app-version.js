const express = require('express');
const router = express.Router();
const AppVersion = require('../models/AppVersion');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/app-version - Check app version and force update requirements
// Query params:
//   - platform: 'ios' | 'android' | 'all' (optional, defaults to 'all')
//   - current_version: '1.2.3' (optional, for client to send their current version)
router.get('/', asyncHandler(async (req, res) => {
  const { platform = 'all', current_version } = req.query;

  AppVersion.getCurrent(platform, (err, versionInfo) => {
    if (err) {
      console.error('Error fetching app version:', err);
      return res.status(500).json({ error: 'Failed to fetch version information' });
    }

    // Build response
    const response = {
      min_version: versionInfo.min_version,
      latest_version: versionInfo.latest_version,
      force_update: versionInfo.force_update || false
    };

    // Add appropriate update URL based on platform
    if (platform === 'ios' || platform === 'all') {
      response.update_url = versionInfo.update_url_ios || '';
      if (platform === 'all' && versionInfo.update_url_android) {
        response.update_url_android = versionInfo.update_url_android;
      }
    } else if (platform === 'android') {
      response.update_url = versionInfo.update_url_android || '';
    }

    // Optional: compare versions if current_version is provided
    if (current_version) {
      response.needs_update = compareVersions(current_version, versionInfo.min_version) < 0;
      response.has_newer_version = compareVersions(current_version, versionInfo.latest_version) < 0;
    }

    res.json(response);
  });
}));

// Simple version comparison function
// Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

module.exports = router;
