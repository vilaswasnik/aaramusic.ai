/**
 * Aara Music - Dynamic Expo Configuration
 * 
 * This config file allows different settings for dev vs production:
 * - DEV: No baseUrl, works immediately in codespace
 * - PROD: Adds baseUrl for GitHub Pages deployment
 * 
 * Environment is controlled by NODE_ENV or explicitly via build commands.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_GITHUB_PAGES_BUILD = process.env.GITHUB_PAGES === 'true';

module.exports = ({ config }) => {
  // Start with base config from app.json
  const baseConfig = require('./app.json').expo;

  // Production web build configuration (for GitHub Pages)
  if (IS_PRODUCTION || IS_GITHUB_PAGES_BUILD) {
    console.log('🚀 Building for PRODUCTION (GitHub Pages)');
    return {
      ...baseConfig,
      experiments: {
        baseUrl: '/aaramusic.ai',
      },
    };
  }

  // Development configuration (codespaces, local dev)
  console.log('🔧 Using DEVELOPMENT configuration');
  return {
    ...baseConfig,
    // No experiments/baseUrl in dev - keeps URLs clean
  };
};
