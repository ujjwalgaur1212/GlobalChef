# GlobalChef

GlobalChef is an Expo + React Native social cooking app foundation. This milestone sets up the production-ready shell, authentication flow, Firebase integration, NativeWind styling, and protected bottom-tab navigation.

Recipe discovery, upload, and community screens are intentionally placeholders for the next milestone.

## Stack

- Expo + React Native + TypeScript
- Expo Router
- Firebase Authentication
- NativeWind / Tailwind CSS
- React Navigation through Expo Router tabs/stacks
- React Hook Form
- Lucide icons

## Folder Structure

```txt
app/           Expo Router route tree, auth stack, protected tab shell
assets/        Static production assets, icons, and splash resources
components/    Shared UI primitives and screen shells
constants/     Theme tokens and validation constants
firebase/      Firebase app/Auth/Firestore initialization
hooks/         Auth context and reusable hooks
services/      Auth service methods and Firebase error handling
types/         Shared TypeScript types and environment declarations
```

## Environment

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Then add the Firebase web app values from Firebase Console:

```txt
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
```

Enable Email/Password authentication in Firebase Console before testing signup or login.

## Commands

```bash
npm install
npm run typecheck
npm start
```

## Run On Simulators

### iPhone Simulator

```bash
npm run ios
```

You can also run `npm start`, then press `i` in the Expo terminal.

### Android Emulator

Start an Android emulator from Android Studio, then run:

```bash
npm run android
```

You can also run `npm start`, then press `a` in the Expo terminal.
