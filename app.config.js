/**
 * Aara Music - Dynamic Expo Configuration
 * 
 * This config file allows different settings for dev vs production:
 * - DEV: No baseUrl, works immediately in codespace
 * - GITHUB PAGES: Adds baseUrl for subfolder deployment
 * - RENDER: No baseUrl (hosted at root)
 * 
 * Environment is controlled by NODE_ENV or explicitly via build commands.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_GITHUB_PAGES_BUILD = process.env.GITHUB_PAGES === 'true';

module.exports = ({ config }) => {
  // Start with base config from app.json
  const baseConfig = require('./app.json').expo;

  // GitHub Pages production build (requires baseUrl for subfolder)
  if (IS_GITHUB_PAGES_BUILD) {
    console.log('🚀 Building for GITHUB PAGES (with baseUrl)');
    return {
      ...baseConfig,
      experiments: {
        baseUrl: '/aaramusic.ai',
      },
    };
  }

  // Render production build (no baseUrl, hosted at root)
  if (IS_PRODUCTION) {
    console.log('🚀 Building for PRODUCTION (Render - no baseUrl)');
    return {
      ...baseConfig,
      // No experiments/baseUrl for Render
    };
  }

  // Development configuration (codespaces, local dev)
  console.log('🔧 Using DEVELOPMENT configuration');
  return {
    ...baseConfig,
    // No experiments/baseUrl in dev - keeps URLs clean
  };
};
