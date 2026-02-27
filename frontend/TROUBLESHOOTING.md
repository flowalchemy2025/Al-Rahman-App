# Expo Troubleshooting Guide

## 🔍 Common Issues & Solutions

### Installation Issues

#### ❌ npm install fails

**Solution 1: Clear cache**

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 2: Use legacy peer deps**

```bash
npm install --legacy-peer-deps
```

---

### Expo Start Issues

#### ❌ "Port 8081 already in use"

**Solution:**

```bash
# Kill the process
npx expo start -c

# Or use different port
npx expo start --port 8082
```

#### ❌ Metro bundler won't start

**Solution:**

```bash
# Clear watchman
watchman watch-del-all

# Clear Metro cache
npx expo start -c

# Complete reset
rm -rf node_modules
rm -rf .expo
npm install
npx expo start -c
```

---

### QR Code / Connection Issues

#### ❌ QR Code won't scan

**Solution 1: Use tunnel mode**

```bash
npx expo start --tunnel
```

_Best for when phone and computer are on different networks_

**Solution 2: Use LAN mode**

```bash
npx expo start --lan
```

_Best for same WiFi network_

**Solution 3: Use localhost (emulator only)**

```bash
npx expo start --localhost
```

#### ❌ "Unable to connect to Metro"

**Checklist:**

- [ ] Phone and computer on same WiFi
- [ ] Firewall not blocking ports
- [ ] Expo Go app is up to date
- [ ] Try tunnel mode: `npx expo start --tunnel`

**For Windows users:**

```bash
# Allow Node.js through firewall
# Settings → Windows Security → Firewall → Allow an app
# Add Node.js if not present
```

---

### Camera Issues

#### ❌ Camera not opening

**Solution 1: Check permissions**

- Open phone Settings
- Find Expo Go app
- Enable Camera permission
- Enable Storage/Photos permission
- Restart Expo Go

**Solution 2: Reload app**

- Shake device
- Tap "Reload"

**Solution 3: Reinstall Expo Go**

- Uninstall Expo Go
- Reinstall from store
- Try again

#### ❌ "Camera permission denied"

**Solution:**

```javascript
// Check if permissions are requested in app.json
"plugins": [
  [
    "expo-image-picker",
    {
      "cameraPermission": "Allow camera access"
    }
  ]
]
```

---

### Image Upload Issues

#### ❌ Image upload fails

**Solution 1: Check network**

```bash
# Test API endpoint
curl https://kareemsnagpur.com/dish-images/
```

**Solution 2: Try smaller image**

- Use lower quality in ImagePicker options
- Compress before upload

**Solution 3: Check FormData format**

```javascript
// Verify in imageService.js
formData.append("image", {
  uri: imageUri,
  name: "photo.jpg",
  type: "image/jpeg",
});
```

---

### Database Issues

#### ❌ Supabase connection failed

**Solution 1: Verify credentials**

```javascript
// Check src/services/supabase.js
const SUPABASE_URL = "https://xxx.supabase.co"; // Correct format
const SUPABASE_ANON_KEY = "eyJ..."; // Full key
```

**Solution 2: Test connection**

```javascript
// Add to any screen temporarily
useEffect(() => {
  const testConnection = async () => {
    const { data, error } = await supabase.from("users").select("count");
    console.log("Connection test:", { data, error });
  };
  testConnection();
}, []);
```

**Solution 3: Check RLS policies**

- Go to Supabase Dashboard
- Check if RLS is enabled
- Verify policies exist
- Temporarily disable for testing

#### ❌ "Row Level Security policy violation"

**Quick fix (testing only):**

```sql
-- In Supabase SQL Editor
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_entries DISABLE ROW LEVEL SECURITY;
```

**Proper fix:**

- Re-run SQL from SUPABASE_SETUP.md
- Check user is authenticated
- Verify user_id matches

---

### App Performance Issues

#### ❌ App is slow/laggy

**Solution 1: Enable Hermes**

- Already enabled in Expo by default
- Check `app.json` has no `jsEngine` override

**Solution 2: Optimize images**

```javascript
// In ImagePicker options
{
  quality: 0.7,
  allowsEditing: true,
  aspect: [4, 3],
}
```

**Solution 3: Clear app data**

- Close Expo Go completely
- Reopen and scan QR again

---

### Build Issues

#### ❌ EAS build fails

**Solution 1: Check eas.json**

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

**Solution 2: Update EAS CLI**

```bash
npm install -g eas-cli@latest
eas build --clear-cache
```

---

### Expo Go Specific Issues

#### ❌ "Something went wrong" in Expo Go

**Solution:**

- Close Expo Go completely
- Clear cache: `npx expo start -c`
- Scan QR code again
- If persists, reinstall Expo Go

#### ❌ White screen on load

**Solution:**

- Check terminal for errors
- Verify all imports are correct
- Check navigation setup
- Try: `npx expo start -c`

---

### Android Specific

#### ❌ Can't run on Android emulator

**Solution:**

```bash
# Make sure emulator is running
adb devices

# Then run
npm run android
```

**If emulator won't start:**

- Open Android Studio
- AVD Manager → Start emulator
- Wait until fully loaded
- Run `npm run android`

---

### iOS Specific

#### ❌ Can't run on iOS simulator

**Solution 1: Install simulators**

```bash
# Check available simulators
xcrun simctl list devices

# Install if missing (Xcode required)
```

**Solution 2: Run command**

```bash
npm run ios
# Or specify device
npx expo run:ios --device "iPhone 14"
```

---

### Module/Import Errors

#### ❌ "Unable to resolve module"

**Solution:**

```bash
# Nuclear option
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm cache clean --force
npm install
npx expo start -c
```

#### ❌ "@expo/vector-icons not found"

**Solution:**

```bash
npm install @expo/vector-icons
npx expo start -c
```

---

## 🛠️ Debugging Tools

### Expo DevTools

```bash
# Start with DevTools
npx expo start --dev-client

# Or press 'd' in terminal
```

### React Native Debugger

1. Install React Native Debugger
2. Start it on port 19000
3. Shake device → Enable Remote JS Debugging

### Logging

```javascript
// Add logs anywhere
console.log("Debug:", variable);

// View in terminal running expo start
// Or shake device → Show Performance Monitor
```

### Network Debugging

```bash
# Use tunnel for network inspection
npx expo start --tunnel

# View requests in terminal
```

---

## 📱 Device-Specific Issues

### Samsung Devices

- Some Samsung devices have strict battery optimization
- Settings → Apps → Expo Go → Battery → Allow background activity

### Xiaomi/MIUI Devices

- MIUI has aggressive app killing
- Settings → Apps → Manage apps → Expo Go → Autostart: ON

### Huawei Devices

- Similar battery optimization issues
- Settings → Battery → App launch → Expo Go → Manage manually

---

## 🔄 Recovery Commands

### Complete Reset

```bash
# Delete everything and start fresh
rm -rf node_modules
rm -rf .expo
rm -rf .expo-shared
rm package-lock.json
npm cache clean --force
npm install
npx expo start -c
```

### Just Metro Cache

```bash
npx expo start -c
# Or
npx expo start --clear
```

### Just Watchman

```bash
watchman watch-del-all
```

---

## 💡 Prevention Tips

### Before Starting Development

1. Update Expo Go app on phone
2. Ensure stable WiFi connection
3. Update Node.js to latest LTS
4. Keep Expo CLI updated: `npm i -g expo-cli`

### During Development

1. Use `npx expo start` instead of `expo start`
2. Clear cache if weird errors occur
3. Test on real device regularly
4. Keep terminal open to see errors

### Best Practices

1. Don't modify node_modules
2. Use version control (git)
3. Test on multiple devices
4. Keep dependencies updated
5. Document custom changes

---

## 🆘 Still Stuck?

### Check These First

1. Is Expo Go up to date?
2. Is Node.js version 18+?
3. Are you on same WiFi?
4. Is firewall blocking?
5. Is Supabase project active?

### Get Help

1. **Expo Discord**: https://chat.expo.dev

   - #help-expo channel
   - Very active community
   - Fast responses

2. **Expo Forums**: https://forums.expo.dev

   - Search existing issues
   - Post detailed question
   - Include error logs

3. **Stack Overflow**:

   - Tag: `expo` and `react-native`
   - Include full error message
   - Share code snippets

4. **GitHub Issues**:
   - Check if it's a known issue
   - Search closed issues too
   - Post new issue with details

### Creating Good Bug Report

Include:

```
**Environment:**
- Expo version: (from package.json)
- Expo Go version: (from app)
- Node version: (run: node -v)
- OS: Windows/Mac/Linux
- Phone: Brand, Model, OS version

**Issue:**
[Clear description]

**Steps to Reproduce:**
1. Step one
2. Step two
3. Error occurs

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Logs:**
[Terminal output]
[Error screenshots]

**Code:**
[Relevant code snippets]
```

---

## ✅ Quick Fixes Checklist

When something breaks, try in this order:

1. [ ] Restart Expo Go app
2. [ ] Shake device → Reload
3. [ ] Clear Metro cache: `npx expo start -c`
4. [ ] Check terminal for errors
5. [ ] Verify internet connection
6. [ ] Check phone permissions
7. [ ] Try tunnel mode
8. [ ] Restart computer
9. [ ] Reinstall node_modules
10. [ ] Reinstall Expo Go app

---

**Remember:** 90% of issues are solved by clearing cache and restarting! 🔄

Good luck! 🚀
