# IDEA LAB Admin Mobile

Native Expo/React Native admin client for the existing IDEA LAB Cloudflare Worker + D1 CRM.

## Included in this MVP
- Secure native login using `/api/mobile/auth/login`
- Seven-day D1 session token stored with `expo-secure-store`
- Live Dashboard, Leads, Clients, Projects, Tasks and Invoices screens
- Pull-to-refresh on operational lists
- Same D1 records and backend permissions as the web CRM
- No WebView and no duplicated database

## Run locally
```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=https://YOUR-IDEA-LAB-HOST npm start
```

`EXPO_PUBLIC_API_BASE_URL` is required so the app never guesses or hard-codes a deployment hostname.

## Backend
`worker/index-mobile.ts` wraps the existing backend. Browser authentication remains cookie-based; native app requests use a Bearer token backed by the same `admin_sessions` D1 table.
