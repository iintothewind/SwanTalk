<p align="center">
  <img src="public/favicon.svg" alt="SwanTalk logo" width="96" height="96" />
</p>

# SwanTalk

A real-time group chat web app for small teams (up to 10 users). Messages are organized into user-created Topics (channels), rendered as Markdown, and synced across all clients in under a second. The UI supports English and Chinese, switchable at runtime.

Built entirely on the Firebase Spark (free) plan — zero hosting cost.

---

## Features

- **Google Sign-In and email/password auth** — session auto-restored on revisit; expires after 7 days of inactivity
- **Public and private topics** — public topics are visible to all users; private topics are visible only to members chosen by the owner; enforced server-side by Firestore Security Rules
- **Private topic management** — owner can rename their private topic and add/remove members (up to 10) at any time via the Manage Members modal
- **Real-time messaging** — Firestore `onSnapshot` delivers messages to all connected clients instantly
- **Markdown rendering** — bold, italic, strikethrough, inline code, fenced code blocks with syntax highlighting, links, inline images, GFM tables, task lists, blockquotes
- **Typing indicators** — shows who is currently typing, with debounce and stale-doc cleanup
- **Unread badges** — numeric badge per topic for messages received while away
- **Offline support** — Firestore IndexedDB persistence; the app loads and reads from cache with no network
- **Email on hover** — hover over any sender name or your own name in the top bar to see the email address
- **Jump navigation** — floating buttons to jump instantly to the top or bottom of the message feed, with image-aware re-anchoring
- **Responsive layout** — two-column sidebar on desktop; horizontal topic pill bar on mobile
- **i18n** — English and Chinese, switchable in the top bar; preference persisted to `localStorage`
- **Client-side cache eviction** — messages older than 7 days are pruned from IndexedDB on startup

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + `@tailwindcss/typography` |
| Auth | Firebase Auth (Google Sign-In + email/password) |
| Database | Cloud Firestore |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| State | React Context + `useReducer` |
| i18n | `react-i18next` + `i18next-browser-languagedetector` |
| Hosting | Firebase Hosting |

---

## Project Structure

```text
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Auth gate + chat layout
├── config.ts                   # All tunable constants (limits, timeouts, locale)
├── firebase.ts                 # Firebase init — Auth and Firestore exports
├── i18n.ts                     # i18next setup
│
├── locales/
│   ├── en/translation.json     # English strings
│   └── zh/translation.json     # Chinese strings
│
├── contexts/
│   ├── AuthContext.tsx          # Auth state, sign-in/sign-out, session expiry
│   └── ChatContext.tsx          # Topics, messages, typing, unread — global reducer
│
├── hooks/
│   ├── useTopics.ts            # Real-time topic list subscription
│   ├── useMessages.ts          # Cache-first load + real-time sync + load-more
│   ├── useTyping.ts            # Write/delete own typing doc; subscribe to others
│   └── useUnread.ts            # Unread count tracking via localStorage timestamps
│
├── components/
│   ├── SignInScreen.tsx         # Google + email/password sign-in page
│   ├── TopBar.tsx              # App header, user name (hover = email), language toggle
│   ├── Sidebar.tsx             # Desktop: topic list + new topic form
│   ├── TopicBar.tsx            # Mobile: scrollable pills + gear for private topic owner
│   ├── TopicItem.tsx           # Topic row; gear icon opens ManageMembersModal for owner
│   ├── NewTopicForm.tsx        # Create public or private topic; member picker
│   ├── ManageMembersModal.tsx  # Rename + manage visibility for own private topic
│   ├── ChatPanel.tsx           # Message list + input container
│   ├── MessageList.tsx         # Scrollable feed; jump-to-top / jump-to-bottom buttons
│   ├── Message.tsx             # Single bubble — Markdown render, sender name hover = email
│   ├── TypingIndicator.tsx     # "X is typing..." bar
│   └── MessageInput.tsx        # Textarea + send button + character counter
│
├── lib/
│   ├── markdown.tsx            # ReactMarkdown config and custom renderers
│   ├── slug.ts                 # Topic name → Firestore document ID slug
│   ├── time.ts                 # Message timestamp formatting
│   └── cacheEviction.ts        # IndexedDB stale-message cleanup
│
└── types/
    └── index.ts                # Shared TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with **Authentication** (Google provider + Email/Password), **Cloud Firestore**, and **App Check** enabled

### 1. Clone and install

```bash
git clone <repo-url>
cd SwanTalk
npm install
```

### 2. Configure Firebase

Create a `.env.local` file in the project root:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY=...
# Optional: pin a registered local App Check debug token
# VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=...
```

Copy these values from **Firebase console → Project settings → Your apps → SDK setup and configuration**.
Use the App Check reCAPTCHA Enterprise site key from **Google Cloud console → reCAPTCHA Enterprise**.

### 3. Deploy Firestore security rules

The rules are stored in [`firestore.rules`](firestore.rules). Deploy them with:

```bash
firebase deploy --only firestore:rules
```

### 4. Run locally

```bash
npm run dev
```

### 5. Register an App Check debug token for local development

This app enables Firebase App Check debug mode only during Vite development (`import.meta.env.DEV`). Production builds continue to use the configured reCAPTCHA Enterprise site key.

On the first local run, open the browser developer console and look for:

```text
AppCheck debug token: "..."
```

Copy that token, then register it in **Firebase console → App Check → Apps → Manage debug tokens**. After the token is registered, Firebase backend services will accept requests from your local browser while App Check enforcement is enabled.

If you want to reuse a known local token across browser sessions or machines, set it in `.env.local`:

```env
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=<registered-debug-token>
```

Keep debug tokens private. Do not commit them to the repository.

### 6. Deploy to Firebase Hosting

```bash
npm run deploy
```

This runs `tsc -b && vite build` then `firebase deploy`.

---

## Configuration

All tunable constants live in [`src/config.ts`](src/config.ts). Edit this file to adjust limits without touching component code.

| Key | Default | Description |
|---|---|---|
| `maxMessageLength` | `2000` | Max characters per message (enforced client-side and in Firestore rules) |
| `messagesPerPage` | `50` | Messages loaded per batch (initial load and load-more) |
| `cacheExpirationDays` | `7` | Messages older than this are pruned from IndexedDB on startup |
| `typingDebounceMs` | `3000` | Milliseconds after last keystroke before clearing the typing indicator |
| `typingStalenessMs` | `5000` | Ignore typing docs older than this (stale cleanup) |
| `sessionDurationDays` | `7` | Auto sign-out after this many days of inactivity |
| `defaultLocale` | `'en'` | Initial language (`'en'` or `'zh'`) before user overrides |
| `firestorePersistence` | `true` | Enable IndexedDB offline cache (set `false` for debugging) |

---

## Firestore Data Model

```text
/users/{uid}
    displayName : string        # Synced from auth profile on every login
    email       : string | null # Synced from auth profile on every login
    photoURL    : string        # Synced from auth profile on every login
    lastSeen    : Timestamp

/topics/{topicId}
    name        : string
    owner       : string        # UID of creator
    createTime  : Timestamp
    access      : "public" | "private"
    status      : "active" | "archived"
    visibility  : array<string> # UIDs who can read this topic (≤ 10)
                                # public  → [owner] at create; all users see it via access query
                                # private → owner + selected members

/topics/{topicId}/messages/{messageId}
    sender      : string        # UID
    senderName  : string        # Denormalized — avoids per-message user lookup
    senderPhoto : string        # Denormalized
    senderEmail : string | null # Denormalized — shown on hover
    content     : string        # Markdown body
    time        : Timestamp     # Canonical sort field

/topics/{topicId}/typing/{uid}
    displayName : string
    timestamp   : Timestamp     # Client cleans up docs older than 5 seconds
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and produce a production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build and deploy to Firebase Hosting |
