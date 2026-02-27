# Restaurant Purchase Management App (Expo Version)

A comprehensive **Expo-powered** React Native mobile application for restaurant owners and managers to track daily purchases. Workers and vendors can upload purchase information with images, providing real-time tracking and analytics.

## 🎯 Why Expo Version?

- ✅ **No Xcode or Android Studio Required** - Run on real devices instantly
- ✅ **2-Minute Setup** - Just scan QR code with Expo Go app
- ✅ **Works on All Computers** - Windows, Mac, or Linux
- ✅ **Live Reload** - See changes instantly on your phone
- ✅ **Easy to Share** - Send QR code to your team
- ✅ **Camera & Gallery Work Perfectly** - Built-in Expo APIs

## 📱 Features

### User Roles

1. **Super Admin** - View all entries, analytics dashboard, filter/search
2. **Worker** - Add purchases, select vendors, view own entries
3. **Vendor** - Add purchases, select workers, view own entries

### Key Functionalities

- 📸 Camera & Photo Library Integration
- 🔍 Search by item name
- 📊 Analytics charts (7/10/14 days)
- ✏️ Edit & Delete entries
- 🔐 Role-based authentication
- ☁️ Cloud storage (Supabase)
- 🌐 Works offline-first

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **Expo Go App** on your phone:
   - [Android - Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

### Installation (5 Minutes)

1. **Install Dependencies**

```bash
cd RestaurantPurchaseAppExpo
npm install
```

2. **Setup Supabase** (Follow `SUPABASE_SETUP.md`)

   - Create account at https://supabase.com
   - Create new project
   - Run SQL to create tables
   - Update credentials in `src/services/supabase.js`

3. **Start the App**

```bash
npm start
```

4. **Scan QR Code**
   - Open Expo Go on your phone
   - Scan the QR code from terminal
   - App loads instantly!

## 📖 Documentation

- **[EXPO_QUICK_START.md](EXPO_QUICK_START.md)** - Complete Expo setup guide
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Database configuration
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues & solutions

## 🎨 Screens

### 1. Login/Register Screen

- Role-based registration (Super Admin, Worker, Vendor)
- Mobile number & username login
- Clean, modern UI

### 2. Dashboard

- **Super Admin**: All entries + analytics chart
- **Worker/Vendor**: Own entries only
- Search, filter, sort functionality
- Pull-to-refresh

### 3. Add Item Screen

- Camera or gallery selection
- Item details (name, quantity, price)
- Select worker/vendor
- Real-time validation

### 4. Edit Entry Screen

- Update all fields
- Change image
- Delete with confirmation
- Entry metadata

## 🛠️ Tech Stack

- **Framework**: Expo 50 + React Native 0.73
- **Navigation**: React Navigation 6
- **Database**: Supabase (PostgreSQL)
- **Image Upload**: Custom API endpoint
- **Charts**: React Native Chart Kit
- **Icons**: Expo Vector Icons
- **Storage**: AsyncStorage

## 📂 Project Structure

```
RestaurantPurchaseAppExpo/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── AddItemScreen.js
│   │   └── EditEntryScreen.js
│   ├── services/
│   │   ├── supabase.js         # Database operations
│   │   └── imageService.js     # Image upload/delete
│   └── navigation/
│       └── AppNavigator.js     # Navigation setup
├── App.js                      # Root component
├── app.json                    # Expo configuration
├── package.json                # Dependencies
└── babel.config.js             # Babel settings
```

## 🎯 Usage

### First Time Setup

1. Register as Super Admin
2. Create Worker and Vendor accounts
3. Login with different roles to test

### Adding Purchases (Worker/Vendor)

1. Login → Click + button
2. Take/upload photo
3. Fill: Item name, quantity, price
4. Select vendor/worker
5. Submit

### Viewing Analytics (Super Admin)

1. Login as Super Admin
2. View chart at top of dashboard
3. Switch between 7/10/14 days
4. Filter by worker or vendor
5. Search specific items

## 🔧 Development

### Running the App

```bash
# Start development server
npm start

# Run on Android device/emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios

# Run in web browser
npm run web
```

### Hot Reload

- Shake device → Reload
- Code changes appear instantly
- No rebuild needed

### Debugging

- Shake device → Debug Remote JS
- View logs in terminal
- Use Chrome DevTools

## 📱 Testing

### On Physical Device (Recommended)

1. Install Expo Go
2. Scan QR code
3. Test all features
4. Camera works perfectly

### On Emulator

```bash
npm run android  # Android Studio needed
npm run ios      # Xcode needed (Mac only)
```

## 🏗️ Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build
eas build -p android --profile preview

# Download APK from dashboard
```

### iOS IPA (Requires Apple Developer Account)

```bash
eas build -p ios --profile preview
```

## 🔐 Security

- Row Level Security (RLS) in Supabase
- Role-based access control
- Secure password hashing
- API key protection
- Data isolation between roles

## 🆘 Troubleshooting

### Common Issues

**QR Code Won't Scan**

```bash
npx expo start --tunnel
```

**Module Not Found**

```bash
rm -rf node_modules
npm install
npm start -c
```

**Camera Not Working**

- Check Expo Go permissions
- Restart app
- Try gallery first

**Database Connection Failed**

- Verify Supabase credentials
- Check internet connection
- Review RLS policies

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more solutions.

## 🎨 Customization

### Change Colors

Edit StyleSheet objects in screen files:

```javascript
const styles = StyleSheet.create({
  button: {
    backgroundColor: "#4CAF50", // Change this
  },
});
```

### Add Features

1. Create new screen in `src/screens/`
2. Add route in `AppNavigator.js`
3. Update database schema if needed

## 📊 Database Schema

### Users Table

- id, user_id, full_name, mobile_number
- username, role, created_at

### Purchase Entries Table

- id, item_name, quantity, price
- image_url, image_filename
- worker_id, vendor_id
- created_at, updated_at

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for complete schema.

## 🌟 Advantages Over Standard React Native

| Feature        | Expo        | Standard RN      |
| -------------- | ----------- | ---------------- |
| Setup Time     | 2 minutes   | 1-2 hours        |
| Xcode Required | ❌ No       | ✅ Yes (iOS)     |
| Android Studio | ❌ No       | ✅ Yes (Android) |
| Test on Device | ✅ Instant  | ⚠️ Complex       |
| Camera API     | ✅ Built-in | ⚠️ Manual setup  |
| Updates        | ✅ OTA      | ❌ App Store     |
| Team Sharing   | ✅ QR Code  | ⚠️ Build files   |

## 🔄 Updates & Maintenance

### Over-The-Air (OTA) Updates

```bash
# Publish update
eas update --branch production

# Users get update automatically
```

### Updating Dependencies

```bash
npm update
expo upgrade
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch
3. Test thoroughly
4. Submit pull request

## 📄 License

This project is provided for educational and commercial use.

## 🙏 Acknowledgments

- Expo team for amazing developer experience
- Supabase for backend infrastructure
- React Native community
- All open-source contributors

## 📞 Support

### Resources

- [Expo Documentation](https://docs.expo.dev)
- [Supabase Docs](https://supabase.com/docs)
- [React Native Docs](https://reactnative.dev)

### Community

- [Expo Discord](https://chat.expo.dev)
- [Supabase Discord](https://discord.supabase.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

## 🎉 Getting Started

Ready to go? Just run:

```bash
npm install
npm start
```

Scan the QR code and start managing your restaurant purchases! 🍽️

---

**Built with ❤️ using Expo + React Native + Supabase**
