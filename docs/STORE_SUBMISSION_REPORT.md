# Luniq Clinic — Store submission report

**Purpose:** Factual technical summary for **Google Play** and **Apple App Store** listing, review, and compliance preparation.  
**App:** Luniq Clinic (clinic staff dashboard — Expo / React Native).  
**Generated from repo:** `Luniq_Clinic` (`app.json`, `eas.json`, `package.json`, source layout).  
**You must still add:** marketing copy, screenshots, privacy policy URL, support contacts, and any legal review outside this document.

---

## 1. App identity

| Field | Value |
|--------|--------|
| **Public name** | Luniq Clinic |
| **Display name (iOS home screen)** | Luniq Clinic (`CFBundleDisplayName`) |
| **Expo slug** | `luniq-clinic` |
| **Expo owner** | `luniqcare` |
| **EAS project ID** | `a8747032-54ba-4867-8b6e-5d7bddd86b04` |
| **Android application ID** | `com.luniqhealth.luniqclinic` |
| **iOS bundle identifier** | `com.luniqhealth.luniqclinic` |
| **Marketing version** (current `app.json`) | `1.0.0` |
| **Deep link / app scheme** | `luniq-clinic` |
| **Orientation** | Portrait |
| **React Native new architecture** | Enabled (`newArchEnabled: true`) |

**Versioning for stores:** `eas.json` uses `appVersionSource: "remote"` — use **EAS / App Store Connect / Play Console** to bump user-facing versions per release policy; keep `app.json` `version` aligned with your release process.

---

## 2. What the app does (high level)

- **Audience:** Clinic staff (authenticated “clinic” role).
- **Functions (from codebase):** Login/register, home dashboard, appointments, patients (intake, lookup, scan, verification, visit details), OPD, uploads, claims (submit/status/detail), reports, clinic settings (profile, timings, services), doctor availability, notifications (in-app + push).
- **Backend:** HTTPS JSON API (default base in code: `https://card.luniqhealth.com/api/v1`; overridable via `EXPO_PUBLIC_API_URL`). All business data is sent to your servers, not to Expo.

---

## 3. Technical stack

| Layer | Details |
|--------|---------|
| **Framework** | Expo SDK **~54**, React **19.1**, React Native **0.81** |
| **Navigation** | Expo Router **~6** |
| **UI** | React Native Paper **~5** |
| **State / server** | Zustand, TanStack React Query, Axios |
| **Push** | `@react-native-firebase/messaging` + `expo-notifications` (presentation / channels); FCM token registered with backend `POST /api/v1/auth/fcm-token` |
| **Device** | `expo-device` |
| **Camera** | `expo-camera` (e.g. claim capture, patient scan flows) |
| **Files** | `expo-document-picker` |
| **Other Expo modules** | `expo-mail-composer`, `expo-print`, `expo-web-browser`, `expo-linear-gradient`, `expo-splash-screen`, `expo-status-bar`, `expo-application`, `expo-constants`, `expo-linking` |
| **Dev** | `expo-dev-client` (development builds; **not** submitted to stores as production) |

---

## 4. Permissions & sensitive capabilities

### Declared in `app.json` (Android)

- `android.permission.POST_NOTIFICATIONS` — push notifications (Android 13+).

### Expected at runtime / merged from libraries (verify merged manifest after `expo prebuild`)

- **Camera** — `expo-camera` (claim / patient scan). Play **Data safety** and App Store **privacy labels** should disclose camera use (e.g. document/QR capture for clinical workflows).
- **Internet** — networking (standard).
- **Notifications** — FCM + local notification plumbing.

**iOS:** Push requires **APNs** configured in Firebase; `GoogleService-Info.plist` must match the App Store bundle id. `ITSAppUsesNonExemptEncryption` is set to **false** in config (declare accurately if you add non-exempt crypto later).

---

## 5. Third-party services & data flows (disclosure checklist)

| Service | Role | Store disclosure tip |
|---------|------|-------------------------|
| **Google Firebase** | FCM push; client config via `google-services.json` / `GoogleService-Info.plist` | Disclose push / device token; link Firebase/Google data terms as applicable. |
| **Your API** (`EXPO_PUBLIC_API_URL`) | Auth, clinic data, PHI/business data per your product | Privacy policy must describe collection, use, retention, legal basis (GDPR etc. if EU users). |
| **Expo / EAS** | Build pipeline; not end-user analytics in the shipped app by default | Clarify you use EAS for builds if asked in security questionnaires. |

**Not included in shipped app:** Laravel service account JSON belongs **only** on the server, not in the mobile repo.

---

## 6. Google Play — submission checklist

1. **Play Console app** with package `com.luniqhealth.luniqclinic` (must match `app.json`).
2. **Release artifact:** **AAB** — `eas build --platform android --profile production` (or `npm run build:android:aab`).
3. **Signing:** Use **Play App Signing**; first EAS build configures or uploads keystore as prompted.
4. **Target / compile SDK:** Set by Expo/React Native toolchain at build time (EAS log / `expo prebuild` output — include in compliance answers if asked).
5. **Data safety form:** Map features to data types (account info, health/clinic operational data if applicable, photos from camera, device IDs, diagnostics). This repo does not auto-generate the form — legal/product must complete it.
6. **Content rating** questionnaire — complete in Play Console.
7. **Store listing:** Short/full description, screenshots (phone + 7" tablet if required), feature graphic, icon (see `assets/images/`).
8. **Privacy policy URL** — required; must match actual practices.
9. **Internal / closed testing** — recommended before production rollout.

**Optional APK:** `production-apk` or `apk` profiles for testers; **production Play listing** normally uses **AAB**.

---

## 7. Apple App Store — submission checklist

1. **App Store Connect** app record with bundle id **`com.luniqhealth.luniqclinic`** (must match Xcode/EAS build).
2. **Archive:** `eas build --platform ios --profile production` (or `npm run build:ios:store`) — produces **IPA** for upload / TestFlight.
3. **Distribution certificates & provisioning:** EAS-managed (recommended) or upload your own; match team id and bundle id.
4. **Encryption export:** `ITSAppUsesNonExemptEncryption: false` — answer App Store Connect encryption questions consistently.
5. **Privacy “nutrition” labels:** Declare data linked to user / tracking per Apple definitions (health, identifiers, diagnostics, etc.).
6. **App Privacy — Firebase / push:** Typically “Device ID” or “Identifiers” + “App functionality” for push; confirm with your DPO.
7. **Push (APNs):** Firebase Console → Cloud Messaging → Apple app configuration (key or cert).
8. **Screenshots** — required sizes for iPhone (and iPad if supporting tablet; `supportsTablet: true` in `app.json`).
9. **Support URL & marketing URL** — App Store required fields.

**`eas.json` → `submit.production`:** Android track is set; add **`ios.ascAppId`** (and other `eas submit` iOS fields) after the App Store Connect app exists.

---

## 8. Build & submit commands (reference)

```bash
cd Luniq_Clinic
eas login

# Play (AAB) + App Store (iOS) release builds
npm run build:stores

# Or separately
npm run build:android:aab
npm run build:ios:store

# Submit latest builds (configure credentials + ascAppId first)
npm run submit:stores
```

---

## 9. Engineering notes for reviewers / internal QA

- **Expo Go** does not support full FCM in recent SDKs; **store builds** use **EAS production** or **dev client** for QA parity with production.
- **Firebase client files** (`credentials/google-services.json`, `credentials/GoogleService-Info.plist`) must match Firebase project and app ids; do not commit real files to **public** repos — use private repo or EAS secrets.
- **Android:** Custom plugin `plugins/withAndroidFirebaseMessagingManifestMerger.js` resolves manifest merger conflicts between `expo-notifications` and `@react-native-firebase/messaging`.
- **Backend push:** Laravel `NotificationService` sends FCM with `notification` + `data` (string values), including `type` for routing (`claim_*`, `appointment_*`).

---

## 10. Items you must supply outside this repo

- [ ] **Privacy policy** (URL) — covers API, Firebase, camera, documents, retention.
- [ ] **Terms of use** (if required for your jurisdiction / account type).
- [ ] **Support email / URL** — visible to users and stores.
- [ ] **Screenshots & preview video** — per store specs.
- [ ] **Age rating / medical disclaimers** — if applicable in your markets.
- [ ] **Corporate entity & DUNS** (Apple), **merchant** agreements (Google) as applicable.
- [ ] **Clinical / HIPAA or local health regulations** — legal review if app handles PHI.

---

## 11. Disclaimer

This document is a **technical inventory** from the repository. It is **not** legal advice, medical compliance certification, or a guarantee of store approval. Final responsibility for listings, disclosures, and regulatory compliance lies with the publisher (your organization).
