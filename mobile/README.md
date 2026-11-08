# Sanitaryware CRM Mobile

React Native Android app for the Sanitaryware CRM backend.

## Tech

- Expo React Native
- React Navigation
- Expo SecureStore for JWT persistence and AsyncStorage for non-sensitive session data
- Axios API client

## Setup

Expo SDK 55 requires Node.js 20.19.x or newer.

```bash
cd mobile
npm install
copy .env.example .env
npm start
```

For Android emulator, the default API URL is:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8081/api
```

For development on a real Android phone, use your machine's LAN IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8081/api
```

Production builds must use HTTPS:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.your-domain.com/api
```

Production builds fail if this variable is missing or does not use HTTPS.

## Current Scope

- Login/logout
- Dashboard summary
- Customers, products, orders, quotations, and payments lists
- Shared authenticated API client

Next high-value mobile features are create/edit forms, camera/document upload, push notifications, and offline drafts.
