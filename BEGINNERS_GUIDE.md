# Restaurant Purchase App - Complete Beginner's Guide

## Prerequisites

Before you start, make sure you have the following installed on your computer:

### For Windows Users:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Choose LTS version
   - Run installer and follow the wizard
   - Verify installation: Open Command Prompt and type `node --version`

2. **Android Studio** (for Android development)
   - Download from: https://developer.android.com/studio
   - Install with default settings
   - Open Android Studio → More Actions → SDK Manager
   - Install:
     - Android SDK Platform 33 or higher
     - Android SDK Build-Tools
     - Android Emulator
   - Create an Android Virtual Device (AVD):
     - Tools → Device Manager → Create Device
     - Choose Pixel 5 or similar
     - Select Android 13 (API 33) system image

3. **Java Development Kit (JDK)**
   - Android Studio includes OpenJDK
   - Set JAVA_HOME environment variable:
     - Right-click "This PC" → Properties → Advanced System Settings
     - Environment Variables → New (System variables)
     - Variable name: `JAVA_HOME`
     - Variable value: `C:\Program Files\Android\Android Studio\jbr`

### For Mac Users:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Install the .pkg file

2. **Homebrew** (package manager)
   - Open Terminal and run:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Watchman**
   ```bash
   brew install watchman
   ```

4. **Xcode** (for iOS development)
   - Download from Mac App Store
   - Open Xcode → Preferences → Locations
   - Select Command Line Tools
   - Install iOS Simulator

5. **CocoaPods** (for iOS dependencies)
   ```bash
   sudo gem install cocoapods
   ```

## Project Setup

### Step 1: Extract and Navigate to Project

1. Extract the project folder to a location like `C:\Projects\` (Windows) or `~/Projects/` (Mac)
2. Open Terminal (Mac) or Command Prompt (Windows)
3. Navigate to the project:
   ```bash
   cd path/to/RestaurantPurchaseApp
   ```

### Step 2: Install Dependencies

Run the following command:
```bash
npm install
```

This will install all required packages. It may take 5-10 minutes.

**For iOS (Mac only):**
```bash
cd ios
pod install
cd ..
```

### Step 3: Configure Supabase

Follow the `SUPABASE_SETUP.md` guide to:
1. Create a Supabase account
2. Set up your database
3. Get your API credentials
4. Update `src/services/supabase.js` with your credentials

### Step 4: Configure Image Upload API

The app uses `https://kareemsnagpur.com/dish-images/` for image uploads. This endpoint should already be working. If you need to use a different endpoint, update the `IMAGE_API_BASE_URL` in `src/services/imageService.js`.

## Running the App

### For Android:

1. **Start Metro Bundler** (in one terminal):
   ```bash
   npm start
   ```

2. **Open a NEW terminal** and run:
   ```bash
   npm run android
   ```

   OR if you have an emulator already running:
   ```bash
   npx react-native run-android
   ```

3. If you're using a physical device:
   - Enable Developer Options on your Android phone
   - Enable USB Debugging
   - Connect via USB
   - Run `npm run android`

**Common Android Issues:**

- **"SDK location not found"**
  - Create a file `android/local.properties`
  - Add: `sdk.dir = C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk` (Windows)
  - Or: `sdk.dir = /Users/YourName/Library/Android/sdk` (Mac)

- **"Gradle build failed"**
  - Open Android Studio
  - File → Open → Select `android` folder
  - Let Gradle sync
  - Try running from Android Studio first

### For iOS (Mac Only):

1. **Start Metro Bundler** (in one terminal):
   ```bash
   npm start
   ```

2. **Open a NEW terminal** and run:
   ```bash
   npm run ios
   ```

   OR to specify a device:
   ```bash
   npx react-native run-ios --simulator="iPhone 14"
   ```

**Common iOS Issues:**

- **"Command PhaseScriptExecution failed"**
  - Delete `ios/Pods` folder
  - Run `pod install` again

- **"No bundle URL present"**
  - Make sure Metro bundler is running
  - Reset Metro cache: `npm start -- --reset-cache`

## Understanding the App Structure

```
RestaurantPurchaseApp/
├── src/
│   ├── screens/          # All app screens
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── AddItemScreen.js
│   │   └── EditEntryScreen.js
│   ├── services/         # Backend services
│   │   ├── supabase.js   # Database operations
│   │   └── imageService.js
│   └── navigation/       # Navigation setup
│       └── AppNavigator.js
├── android/              # Android-specific files
├── ios/                  # iOS-specific files
├── App.js               # Main app component
└── package.json         # Dependencies
```

## Using the App

### 1. First Time Setup

1. Open the app
2. Click "Register"
3. Create a Super Admin account:
   - Full Name: Your Name
   - Mobile: 1234567890
   - Username: admin
   - Password: admin123
   - Role: Super Admin
4. Login with your credentials

### 2. Creating Workers and Vendors

1. Register additional accounts with roles "Worker" and "Vendor"
2. Log out and log in with different accounts to test

### 3. Adding Purchase Entries

**As Worker:**
1. Login as Worker
2. Click the + button
3. Take/upload photo of item
4. Fill in: Item name, quantity, price
5. Select vendor
6. Click "Add Item"

**As Vendor:**
1. Same process, but select worker instead

### 4. Viewing Dashboard

**Super Admin** can see:
- All entries from all workers and vendors
- Analytics chart of purchases
- Filter by worker, vendor, date, or item
- Search functionality

**Worker/Vendor** can see:
- Only their own entries
- Edit and delete options
- Search and filter

## Troubleshooting

### Metro Bundler Issues

**"Port 8081 already in use":**
```bash
# Kill the process
npx react-native start --reset-cache
```

**"Unable to resolve module":**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### Build Issues

**Android:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**iOS:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Database Connection Issues

1. Check internet connection
2. Verify Supabase credentials in `src/services/supabase.js`
3. Check Supabase Dashboard → Settings → API
4. Make sure Row Level Security policies are set up

### Image Upload Issues

1. Check network connection
2. Verify the image API endpoint is accessible
3. Test endpoint in browser: https://kareemsnagpur.com/dish-images/
4. Check Android/iOS permissions for camera and storage

## Development Tips

### Hot Reload
- Press `r` in Metro terminal to reload
- Press `d` to open developer menu
- Shake device (or Cmd+D on iOS / Cmd+M on Android) for dev menu

### Debugging
1. Open Chrome
2. Navigate to: `chrome://inspect`
3. Click "inspect" under your app
4. Use Console for debugging

### Logging
Add console logs in your code:
```javascript
console.log('Debug info:', variable);
```

View logs in Metro terminal

## Production Build

### Android APK:

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

### iOS (Requires Apple Developer Account):

1. Open `ios/RestaurantPurchaseApp.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Follow distribution wizard

## Updating the App

To add new features or fix bugs:

1. Make changes to the code
2. Save files
3. App will hot reload automatically
4. If not, press `r` in Metro terminal

## Getting Help

### Resources:
- React Native Docs: https://reactnative.dev/docs/getting-started
- Supabase Docs: https://supabase.com/docs
- Stack Overflow: Search "react-native [your issue]"

### Common Commands:

```bash
# Start metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Clear cache
npm start -- --reset-cache

# Check React Native environment
npx react-native doctor

# Install new package
npm install package-name

# Update dependencies
npm update
```

## Security Notes

1. Never share your Supabase credentials
2. Use environment variables for production
3. Enable proper Row Level Security in Supabase
4. Regularly update dependencies for security patches

## Next Steps

After successful setup:

1. Test all three roles (Super Admin, Worker, Vendor)
2. Try adding, editing, and deleting entries
3. Test search and filter functionality
4. Review analytics on Super Admin dashboard
5. Customize colors and styling in StyleSheet objects
6. Add additional features as needed

## Contact & Support

If you encounter issues not covered here:
1. Check error messages in Metro terminal
2. Review Supabase logs in Dashboard
3. Search for error messages online
4. Check React Native documentation

Good luck with your Restaurant Purchase Management App! 🍽️
