# 📱 App Store Submission Guide

This guide will help you prepare and submit Aara Music to the Apple App Store and Google Play Store.

## 🍎 Apple App Store (iOS)

### Prerequisites
- Apple Developer Account ($99/year)
- Mac computer (required for iOS builds)
- Xcode installed

### Step 1: Register App Identifier
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create new App ID:
   - Bundle ID: `com.aaramusic.app` (or your custom one)
   - Name: Aara Music
   - Enable capabilities: Background Modes (Audio)

### Step 2: Prepare App Assets
You'll need:
- **App Icon**: 1024x1024px PNG (no transparency)
- **Screenshots**: 
  - iPhone 6.7": 1290x2796px (3-10 images)
  - iPhone 6.5": 1242x2688px
  - iPad Pro 12.9": 2048x2732px
- **App Preview Video** (optional but recommended)

### Step 3: Update app.json
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.aaramusic.app",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "UIBackgroundModes": ["audio"],
        "NSAppleMusicUsageDescription": "This app needs access to play music."
      }
    }
  }
}
```

### Step 4: Build with EAS
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Create iOS build
eas build --platform ios

# For App Store submission
eas build --platform ios --profile production
```

### Step 5: Create App Store Connect Listing
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in app information:
   - **Name**: Aara Music
   - **Bundle ID**: com.aaramusic.app
   - **SKU**: aaramusic001
   - **Primary Language**: English

### Step 6: Submit for Review
```bash
# Submit to App Store
eas submit --platform ios
```

Or manually upload using Xcode's Application Loader.

### App Store Metadata Template

**App Name**: Aara Music

**Subtitle**: Stream Your Favorite Music

**Description**:
```
Aara Music is a modern music streaming app that brings your favorite songs to life with a beautiful, intuitive interface.

Features:
• Beautiful, easy-to-use interface
• Create and manage playlists
• Search for songs, albums, and artists
• High-quality audio playback
• Background audio support
• Shuffle and repeat modes
• Personalized recommendations

Whether you're commuting, working out, or just relaxing, Aara Music has you covered with the perfect soundtrack for every moment.
```

**Keywords**: music, streaming, player, songs, playlists, audio

**Support URL**: https://github.com/vilaswasnik/aaramusic.ai

**Marketing URL**: (your website)

**Privacy Policy URL**: (required - create one)

---

## 🤖 Google Play Store (Android)

### Prerequisites
- Google Play Console account ($25 one-time fee)
- No Mac required!

### Step 1: Register App
1. Go to [Google Play Console](https://play.google.com/console)
2. Create Application
3. Fill in basic details:
   - App name: Aara Music
   - Default language: English (United States)
   - App/Game: App
   - Free/Paid: Free

### Step 2: Prepare Assets
You'll need:
- **App Icon**: 512x512px PNG (32-bit with alpha)
- **Feature Graphic**: 1024x500px JPG/PNG
- **Screenshots**:
  - Phone: 320-3840px (min 2, max 8)
  - 7-inch Tablet (optional)
  - 10-inch Tablet (optional)
- **High-res Icon**: 512x512px PNG

### Step 3: Update app.json
```json
{
  "expo": {
    "android": {
      "package": "com.aaramusic.app",
      "versionCode": 1,
      "permissions": [
        "FOREGROUND_SERVICE",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      }
    }
  }
}
```

### Step 4: Build APK/AAB
```bash
# Build AAB (Android App Bundle) - recommended
eas build --platform android --profile production

# Or build APK for direct distribution
eas build --platform android --profile preview
```

### Step 5: Complete Store Listing

**Short Description** (80 chars):
```
Stream music with a beautiful, easy-to-use interface
```

**Full Description** (4000 chars):
```
🎵 Aara Music - Your Personal Music Streaming App

Discover, stream, and enjoy your favorite music with Aara Music's beautiful and intuitive interface. Inspired by the best music apps, Aara Music delivers a premium listening experience.

✨ KEY FEATURES

🎨 Beautiful Design
• Modern, clean interface
• Dark theme for comfortable viewing
• Smooth animations and transitions

🎵 Music Playback
• High-quality audio streaming
• Background playback support
• Sleep timer
• Gapless playback

📚 Library Management
• Create custom playlists
• Organize by songs, albums, artists
• Search functionality
• Recently played history

🎯 Discovery
• Personalized recommendations
• Featured playlists
• Browse by genre
• Trending charts

🎼 Player Controls
• Play, pause, skip controls
• Shuffle and repeat modes
• Progress bar with seek
• Queue management
• Share songs with friends

Whether you're working, exercising, or relaxing, Aara Music is the perfect companion for all your musical moments.

Download now and start streaming!

📧 Support
Have questions or feedback? Contact us at [your-email]

🔒 Privacy
We respect your privacy. Read our privacy policy at [policy-url]
```

**Category**: Music & Audio

**Content Rating**: Everyone

**Privacy Policy**: (required - URL to your policy)

### Step 6: Upload Build
```bash
# Submit to Google Play
eas submit --platform android
```

---

## 📋 Pre-Submission Checklist

### Both Platforms
- [ ] App tested thoroughly on real devices
- [ ] All features working correctly
- [ ] No crashes or major bugs
- [ ] Privacy policy created and published
- [ ] Terms of service created (if needed)
- [ ] Support email/website set up
- [ ] App icon finalized (high quality)
- [ ] Screenshots taken (multiple screens)
- [ ] App description written
- [ ] Keywords researched

### iOS Specific
- [ ] Apple Developer account active
- [ ] Certificates and provisioning profiles configured
- [ ] Background audio tested
- [ ] App Store Connect listing complete
- [ ] TestFlight beta testing (recommended)
- [ ] Age rating selected
- [ ] Export compliance information provided

### Android Specific
- [ ] Google Play Console account active
- [ ] Content rating questionnaire completed
- [ ] Target API level meets requirements
- [ ] App bundle signed correctly
- [ ] Feature graphic created
- [ ] Categorization selected

---

## 🔐 Privacy Policy Template

You MUST have a privacy policy. Here's a basic template:

```markdown
# Privacy Policy for Aara Music

Last updated: [DATE]

## Information We Collect
- Device information (for analytics)
- Usage data (songs played, playlists created)
- Account information (if you create an account)

## How We Use Information
- To provide music streaming services
- To improve the app experience
- To send important updates

## Data Storage
- Your data is stored securely
- We do not sell your personal information
- You can request data deletion at any time

## Third-Party Services
- We use Firebase for backend services
- Analytics for app improvement
- Music content from licensed providers

## Your Rights
- Access your data
- Delete your account
- Opt out of analytics

## Contact Us
Email: [your-email@domain.com]
Website: [your-website.com]
```

Host this on GitHub Pages or your website.

---

## 🚀 Launch Strategy

### Pre-Launch (2 weeks before)
1. **Beta Testing**
   - iOS: Use TestFlight
   - Android: Use internal testing track
   - Get feedback from 10-20 users

2. **Marketing Materials**
   - Create social media accounts
   - Prepare launch graphics
   - Write press release

3. **Landing Page**
   - Create simple website
   - Add download links
   - Collect email signups

### Launch Day
1. Submit to stores
2. Post on social media
3. Email your list
4. Ask friends to review
5. Post on Product Hunt (optional)

### Post-Launch (First week)
1. Monitor reviews
2. Respond to user feedback
3. Fix critical bugs quickly
4. Update screenshots if needed
5. Ask satisfied users for reviews

---

## 📊 App Store Optimization (ASO)

### Key Factors

**App Title**
- Include main keyword
- Keep it memorable
- Under 30 characters

**Keywords (iOS)**
- Research competitors
- Use all 100 characters
- Avoid repetition

**Description**
- Front-load important features
- Use bullet points
- Include keywords naturally
- Update regularly

**Screenshots**
- Show best features first
- Add captions
- Use real content
- Update seasonally

**Reviews & Ratings**
- Respond to all reviews
- Fix reported issues
- Ask happy users to review
- Use in-app review prompts

---

## 🆘 Common Rejection Reasons

### iOS
1. Crashes on launch
2. Broken links
3. Missing privacy policy
4. UI doesn't match screenshots
5. Background audio not working

### Android
1. Violates content policy
2. Missing required metadata
3. Improper content rating
4. Privacy policy issues
5. Crashes or ANRs

### How to Avoid
- Test thoroughly
- Follow guidelines
- Be honest in description
- Have all required assets
- Respond quickly to feedback

---

## 📈 Post-Submission

After approval:
1. **Monitor Metrics**
   - Downloads
   - Active users
   - Retention rate
   - Crash rate

2. **Gather Feedback**
   - Read reviews
   - Check support emails
   - Monitor social media

3. **Plan Updates**
   - Bug fixes (weekly)
   - New features (monthly)
   - Major updates (quarterly)

4. **Marketing**
   - App Store optimization
   - Social media presence
   - Content marketing
   - Influencer outreach

---

## 🎯 Success Tips

1. **Quality First**: A polished app is better than many features
2. **Listen to Users**: Implement requested features
3. **Regular Updates**: Show the app is actively maintained
4. **Good Support**: Respond to user issues quickly
5. **Marketing**: Great app + good marketing = success

---

Good luck with your submission! 🚀

For questions or help, open an issue on GitHub.
