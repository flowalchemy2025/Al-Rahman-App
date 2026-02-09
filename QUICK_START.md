# Quick Start Cheat Sheet

## ⚡ Fast Setup (5 Minutes)

### 1. Install Dependencies
```bash
cd Al-Rahman-App
npm install
```

### 2. Setup Supabase (2 minutes)
1. Go to https://supabase.com → Sign up
2. Create new project
3. Copy Project URL and API Key from Settings → API
4. Run SQL from `SUPABASE_SETUP.md` in SQL Editor
5. Update `src/services/supabase.js`:
   ```javascript
   const SUPABASE_URL = 'your-url-here';
   const SUPABASE_ANON_KEY = 'your-key-here';
   ```

### 3. Run the App
```bash
# Terminal 1
npm start

# Terminal 2 (Android)
npm run android

# OR Terminal 2 (iOS - Mac only)
npm run ios
```

## 🎯 First Time Use

1. Open app → Register
2. Create Super Admin:
   - Name: Admin
   - Mobile: 1234567890
   - Username: admin
   - Password: admin123
   - Role: Super Admin

3. Login and start adding items!

## 🔑 Key Commands

```bash
# Start Metro
npm start

# Clear cache
npm start -- --reset-cache

# Android
npm run android

# iOS
npm run ios

# Check environment
npx react-native doctor

# Clean Android build
cd android && ./gradlew clean && cd ..

# Reinstall iOS pods
cd ios && pod install && cd ..
```

## 📸 Test the App Flow

### As Worker:
1. Login as Worker
2. Click + button
3. Take photo → Add item details → Select Vendor → Submit

### As Vendor:
1. Login as Vendor
2. Click + button
3. Take photo → Add item details → Select Worker → Submit

### As Super Admin:
1. Login as Super Admin
2. View all entries
3. See analytics chart
4. Filter by worker/vendor/date
5. Search items

## 🚨 Common Quick Fixes

### Metro won't start:
```bash
npm start -- --reset-cache
```

### Android build fails:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### "Unable to resolve module":
```bash
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### Database not connecting:
- Check internet
- Verify credentials in `src/services/supabase.js`
- Check Supabase dashboard is accessible

## 📋 Role Features Quick Reference

| Feature | Super Admin | Worker | Vendor |
|---------|-------------|--------|--------|
| Add Items | ❌ | ✅ | ✅ |
| View Own Items | N/A | ✅ | ✅ |
| View All Items | ✅ | ❌ | ❌ |
| Analytics Chart | ✅ | ❌ | ❌ |
| Filter by User | ✅ | ❌ | ❌ |
| Edit Own Items | N/A | ✅ | ✅ |
| Delete Own Items | N/A | ✅ | ✅ |

## 🎨 Quick Customization

### Change Primary Color:
Find `#4CAF50` in all screen files and replace with your color.

### Change App Name:
Edit `app.json`:
```json
{
  "displayName": "Your App Name"
}
```

## 📱 Device Testing

### Android Physical Device:
1. Enable Developer Options
2. Enable USB Debugging
3. Connect USB
4. Run `npm run android`

### iOS Physical Device (Mac + Apple Dev Account):
1. Open `ios/RestaurantPurchaseApp.xcworkspace` in Xcode
2. Select your device
3. Click Run ▶️

## 🔗 Important Links

- Supabase Dashboard: https://app.supabase.com
- React Native Docs: https://reactnative.dev
- Image API: https://kareemsnagpur.com/dish-images/

## ⚠️ Before Production

- [ ] Change Supabase URL and keys to production
- [ ] Enable RLS policies
- [ ] Test all user roles
- [ ] Build release APK/IPA
- [ ] Test on real devices
- [ ] Secure API endpoints

## 💡 Pro Tips

1. Use `console.log()` for debugging - view in Metro terminal
2. Press `R` in Metro to reload app
3. Shake device for dev menu (Cmd+D iOS / Cmd+M Android)
4. Keep Metro running in background
5. Use Chrome DevTools: chrome://inspect

## 🆘 Emergency Contacts

- React Native Discord: https://discord.gg/reactnative
- Supabase Discord: https://discord.supabase.com
- Stack Overflow: Tag `react-native`

---

**🎉 You're ready to go! Start building!**
