# SwanTalk — Design Document

**Version:** 1.1  
**Date:** April 6, 2026  
**Status:** Ready for Implementation

---

## 1. Overview

SwanTalk is a zero-cost, real-time instant messaging web application for up to 10 users. Messages are organized by user-created Topics (channels). The app runs on Firebase Spark Plan, uses Google Sign-In for authentication, and renders message content as Markdown with support for inline images, URL links, and code blocks. The UI supports English and Chinese with a runtime-switchable i18n system.

### 1.1 Goals

- Real-time text chat with sub-second delivery across all connected clients.
- Topic-based message isolation so conversations stay organized.
- Markdown rendering for rich content (images via URL, links, code blocks).
- Responsive UI that works on desktop and mobile browsers.
- Fully offline-capable on refresh via Firestore IndexedDB persistence.
- Multi-language UI (English and Chinese) switchable at runtime.
- Configurable client-side cache expiration and message length limits.
- Zero hosting cost (Firebase Spark Plan only).

### 1.2 Non-Goals (v1)

- File/image upload (no Firebase Storage usage).
- End-to-end encryption.
- Message reactions or threading.
- Push notifications.
- User roles or admin panel.
- Message search.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Fast dev server, small bundle, wide ecosystem |
| Language | TypeScript | Type safety across Firestore schemas and component props |
| Styling | Tailwind CSS | Utility-first, responsive-first, zero runtime cost |
| Auth | Firebase Auth (Google Sign-In) | Zero-config OAuth, free tier covers 10 users easily |
| Database | Cloud Firestore | Real-time listeners, offline persistence, generous Spark limits |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` | GFM tables, task lists, syntax-highlighted code blocks, safe by default |
| State | React Context + `useReducer` | Lightweight; no need for Redux at this scale |
| i18n | `react-i18next` + `i18next` | Proven React integration, lazy-loaded locale bundles, supports ICU plurals |
| Hosting | Firebase Hosting | Free tier, automatic HTTPS, global CDN |

---

## 3. Database Architecture (Firestore)

### 3.1 Collection Schema

```
/users/{uid}
    displayName : string        # From Google/auth profile
    email       : string | null # From Google/auth profile
    photoURL    : string        # From Google/auth profile
    lastSeen    : Timestamp     # Updated on activity

/topics/{topicId}
    name        : string        # Display name, e.g. "Development"
    createdBy   : string        # UID of creator
    createdAt   : Timestamp     # serverTimestamp()

/topics/{topicId}/messages/{messageId}
    sender      : string        # UID (FK to /users)
    senderName  : string        # Denormalized display name (for read perf)
    senderPhoto : string        # Denormalized photo URL
    senderEmail : string | null # Denormalized email (shown on hover)
    content     : string        # Markdown-formatted body
    time        : Timestamp     # serverTimestamp() — canonical ordering field

/topics/{topicId}/typing/{uid}
    displayName : string        # Who is typing
    timestamp   : Timestamp     # serverTimestamp(); TTL-cleaned client-side
```

### 3.2 Design Decisions

**Why denormalize `senderName` / `senderPhoto` / `senderEmail` onto each message?**  
Avoids a secondary read per message. At 10 users the staleness risk is negligible. If a user changes their Google profile picture or display name, old messages keep the old values — acceptable for v1. `senderEmail` is included so the UI can show the sender's email on hover without an extra Firestore lookup.

**Why a `/typing/{uid}` sub-collection instead of a single document?**  
Each user writes only their own document, avoiding write contention. The client deletes the document (or lets it expire) when the user stops typing.

**Why `topicId` is a slugified string (e.g. `development`) rather than an auto-ID?**  
Human-readable paths make Firestore console debugging easier and allow future deep-linking (`/topic/development`).

### 3.3 Indexes

Firestore automatically creates single-field indexes. The only composite index needed:

| Collection | Fields | Order |
|---|---|---|
| `/topics/{topicId}/messages` | `time` | Ascending |

This is a single-field index on `time`, so Firestore creates it automatically. No manual index configuration needed.

---

## 4. Authentication

### 4.1 Flow

1. On app load, call `onAuthStateChanged()`.
2. If no user → show a full-screen sign-in page with a "Sign in with Google" button.
3. On sign-in success → write/update the `/users/{uid}` document with `displayName`, `email`, `photoURL`, and `lastSeen`.
4. Redirect to the main chat view.

### 4.2 Session Handling

- Firebase Auth persists the session in IndexedDB by default (`browserLocalPersistence`).
- On revisit, the user is auto-signed-in with no interaction.
- A "Sign Out" option lives in a user avatar dropdown in the top bar.

---

## 5. Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles: owner can write, any authed user can read
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Topics: any authed user can read and create
    match /topics/{topicId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.keys().hasAll(['name', 'createdBy', 'createdAt'])
                    && request.resource.data.createdBy == request.auth.uid;
      allow update, delete: if false; // No edits or deletions in v1

      // Messages: any authed user can read and create
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null
                      && request.resource.data.sender == request.auth.uid
                      && request.resource.data.time == request.time
                      && request.resource.data.content.size() <= 2000;
        allow update, delete: if false; // Immutable messages in v1
      }

      // Typing indicators: owner can write, any authed user can read
      match /typing/{uid} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

---

## 6. Client Architecture

### 6.1 Component Tree

```
<App>
  ├── <I18nProvider>                  # react-i18next provider
  ├── <AuthGate>                      # Shows SignIn or main app
  │   ├── <SignInScreen>              # Google sign-in button
  │   └── <ChatLayout>               # Main authenticated view
  │       ├── <TopBar>               # App name, user avatar (hover shows email), sign-out, language toggle
  │       ├── <Sidebar>              # Desktop only: topic list + "New Topic" button
  │       │   ├── <TopicItem>        # Single topic row with unread badge
  │       │   └── <NewTopicForm>     # Inline input to create a topic
  │       ├── <TopicBar>             # Mobile only: horizontal scrollable topic pills
  │       └── <ChatPanel>            # Active topic's chat
  │           ├── <MessageList>      # Scrollable message feed
  │           │   └── <Message>      # Single message bubble w/ Markdown; hover sender name shows email
  │           ├── <TypingIndicator>  # "Alice is typing..."
  │           └── <MessageInput>     # Text area + send button + char counter
```

### 6.2 State Shape

```typescript
interface AppState {
  user: {
    uid: string;
    displayName: string;
    photoURL: string;
    email?: string;
  } | null;

  topics: Topic[];                 // All topic documents
  activeTopicId: string | null;    // Currently selected topic

  messages: Message[];             // Messages for the active topic
  typingUsers: TypingUser[];       // Users typing in the active topic

  unreadCounts: Record<string, number>;  // topicId → unread count

  ui: {
    sidebarOpen: boolean;          // For mobile drawer toggle
    loading: boolean;
  };
}
```

### 6.3 Key Hooks

| Hook | Responsibility |
|---|---|
| `useAuth()` | Wraps `onAuthStateChanged`, exposes `user`, `signIn()`, `signOut()` |
| `useTopics()` | `onSnapshot` on `/topics` collection, returns live topic list |
| `useMessages(topicId)` | Loads last 50 from cache, syncs delta, subscribes to real-time updates |
| `useTyping(topicId)` | Writes/deletes own typing doc; subscribes to others' typing docs |
| `useUnread()` | Tracks `lastReadTime` per topic in localStorage, compares to latest message `time` |

---

## 7. Core Features — Detailed Behavior

### 7.1 Smart Sync (Message Loading)

```
1. App initializes Firestore with `enableIndexedDbPersistence(db)`
   (Wrapped in try-catch; falls back gracefully if another tab holds the lock.)

2. When user selects a topic:
   a. Detach the previous topic's onSnapshot listener.
   b. Query: messages collection
        .orderBy('time', 'desc')
        .limit(50)
      This hits the local IndexedDB cache first (instant render),
      then reconciles with the server.
   c. Reverse the result array for chronological display.
   d. Attach a new onSnapshot listener on the same query.
      - On each snapshot, diff `docChanges()` for type === 'added'.
      - Append new messages to state; auto-scroll to bottom.

3. Load-more (scroll to top):
   a. Query: messages collection
        .orderBy('time', 'desc')
        .startAfter(oldestLoadedMessage.time)
        .limit(50)
   b. Prepend results to state; preserve scroll position.
```

### 7.2 Sending a Message

```
1. User types in <MessageInput> and presses Enter (or taps Send).
2. Validate:
   a. Trim content; reject if empty.
   b. Check content.length <= APP_CONFIG.maxMessageLength.
      If exceeded, show an inline error (translated via i18n) and do not send.
   c. The <MessageInput> shows a live character counter: "128 / 2000".
3. Optimistic UI: Immediately append a local message object to state
   with a temporary ID and `time: new Date()` (local estimate).
4. Firestore write:
     addDoc(collection(db, 'topics', topicId, 'messages'), {
       sender: auth.currentUser.uid,
       senderName: auth.currentUser.displayName,
       senderPhoto: auth.currentUser.photoURL,
       content: trimmedContent,
       time: serverTimestamp()
     })
5. The onSnapshot listener will deliver the server-confirmed document.
   Replace the optimistic message (match by content + sender) with
   the canonical one.
6. Clear the typing indicator document for this user.
```

### 7.3 Typing Indicator

```
Debounced write strategy:
- On keydown in <MessageInput>:
    If no typing doc exists for this user in this topic:
      setDoc(doc(db, 'topics', topicId, 'typing', uid), {
        displayName, timestamp: serverTimestamp()
      })
- Set a 3-second debounce timer.
- If the timer expires with no new keystrokes:
    deleteDoc(doc(db, 'topics', topicId, 'typing', uid))
- Also delete on message send and on topic switch.

Display logic:
- onSnapshot on /topics/{topicId}/typing
- Filter out own UID and any docs older than 5 seconds (stale cleanup).
- Render: "Alice is typing..." or "Alice, Bob are typing..."
```

### 7.4 Unread Indicators

```
Storage: localStorage key `unread:{topicId}` = ISO timestamp of last read message.

On receiving a new message via onSnapshot:
  If message.topicId !== activeTopicId:
    Increment unreadCounts[topicId] in state.

On switching to a topic:
  Set localStorage `unread:{topicId}` = now.
  Reset unreadCounts[topicId] to 0.

Display: <TopicItem> shows a numeric badge when unreadCounts[topicId] > 0.
```

### 7.5 Markdown Rendering

Each `<Message>` component renders `content` through:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
  components={{
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    img: ({ src, alt }) => (
      <img src={src} alt={alt} loading="lazy"
           style={{ maxWidth: '100%', borderRadius: 8 }} />
    ),
    code: ({ inline, className, children }) =>
      inline
        ? <code className="inline-code">{children}</code>
        : <pre><code className={className}>{children}</code></pre>
  }}
>
  {message.content}
</ReactMarkdown>
```

Supported Markdown features: bold, italic, strikethrough, inline code, fenced code blocks with syntax highlighting, links (open in new tab), images (rendered inline with max-width constraint), GFM tables, task lists, blockquotes.

### 7.6 Topic Creation

```
1. User clicks "+ New Topic" in the sidebar.
2. An inline text input appears.
3. User types a name (e.g. "Design Review") and presses Enter.
4. Client generates topicId by slugifying the name:
     "Design Review" → "design-review"
   If the slug already exists, append a short random suffix.
5. Write:
     setDoc(doc(db, 'topics', topicId), {
       name: "Design Review",
       createdBy: auth.currentUser.uid,
       createdAt: serverTimestamp()
     })
6. Auto-select the new topic.
```

---

## 8. Responsive Layout

### 8.1 Breakpoints

| Breakpoint | Layout |
|---|---|
| ≥ 768px (tablet/desktop) | Fixed 280px sidebar + fluid chat panel side by side |
| < 768px (mobile) | Full-screen chat panel; topics accessible via a horizontal pill bar or dropdown at the top of the screen |

### 8.2 Desktop Layout

Standard two-column: fixed sidebar on the left with topic list and "+ New Topic" button, chat panel fills the remaining width.

### 8.3 Mobile Layout — Topic Selector on Top

On mobile, the sidebar is replaced by a compact **Topic Bar** pinned below the TopBar. This avoids the overhead of a hamburger drawer for what is essentially a single-tap action.

```
┌──────────────────────────────┐
│  SwanTalk          [avatar ▾]│  ← TopBar (app name, user menu, language toggle)
├──────────────────────────────┤
│ #General  #Dev  #Design  [+]│  ← TopicBar: horizontally scrollable pill tabs
├──────────────────────────────┤
│                              │
│  Message feed (full width)   │  ← MessageList: 100% of remaining height
│                              │
│                              │
├──────────────────────────────┤
│  Alice is typing...          │  ← TypingIndicator
├──────────────────────────────┤
│  [message input]       [Send]│  ← MessageInput: sticky bottom
└──────────────────────────────┘
```

**TopicBar behavior:**
- Horizontally scrollable row of pill-shaped buttons, one per topic.
- The active topic pill is visually highlighted (filled background).
- Unread badges appear as a small dot or count on the pill.
- A `[+]` button at the end opens an inline input (overlays the bar) to create a new topic.
- If the topic list is too wide, the bar scrolls freely with `-webkit-overflow-scrolling: touch` for momentum.

### 8.4 Mobile-Specific Behavior

- Message input sticks to the bottom of the viewport with proper `dvh` handling to avoid iOS keyboard issues.
- The send button is a visible icon button (not just Enter) for touch usability.
- Images in messages are constrained to `max-width: 100%` to prevent horizontal overflow.
- The TopicBar height is fixed at ~44px so it doesn't eat into message space.

---

## 9. Application Configuration

All tunable constants live in a single `src/config.ts` file. This makes it easy for the developer to adjust limits without hunting through components.

```typescript
// src/config.ts

export const APP_CONFIG = {
  // --- Message Limits ---
  maxMessageLength: 2000,        // Max characters per message (enforced client-side + security rules)

  // --- Cache / Sync ---
  cacheExpirationDays: 7,        // Messages older than this in IndexedDB are eligible for eviction
  messagesPerPage: 50,           // Number of messages loaded per batch (initial + load-more)

  // --- Typing Indicator ---
  typingDebounceMs: 3000,        // How long after last keystroke before clearing typing status
  typingStalenessMs: 5000,       // Ignore typing docs older than this (stale cleanup)

  // --- UI ---
  topicBarMaxVisiblePills: 5,    // Hint for mobile TopicBar; beyond this it scrolls
  defaultLocale: 'en',           // 'en' | 'zh' — initial language before user overrides

  // --- Firebase ---
  firestorePersistence: true,    // Enable IndexedDB persistence (set false for debugging)
} as const;

export type AppConfig = typeof APP_CONFIG;
```

**Security rule enforcement of `maxMessageLength`:**

The Firestore security rules in Section 5 should be extended to also validate content length server-side. Add this condition to the message `create` rule:

```
&& request.resource.data.content.size() <= 2000
```

This prevents bypass via direct API calls. The 2000 value should match `APP_CONFIG.maxMessageLength`.

---

## 10. Client-Side Cache Design

### 10.1 Architecture

SwanTalk's caching is two-layered:

**Layer 1 — Firestore's built-in IndexedDB persistence** (`enableIndexedDbPersistence`): This is Firestore's own offline cache. It stores every document the client has read. On app load, queries hit this cache first (instant render) and then reconcile with the server. This layer is managed by Firestore SDK — we don't directly manipulate it.

**Layer 2 — Application-level cache eviction** (custom logic): Firestore's built-in cache never expires documents on its own. Over weeks of use, the IndexedDB can grow unboundedly. SwanTalk adds a lightweight eviction layer on top.

### 10.2 Eviction Strategy

```
On app startup (after auth, before attaching listeners):

1. Read APP_CONFIG.cacheExpirationDays (default: 7).
2. Compute cutoff = new Date(Date.now() - cacheExpirationDays * 86400000).
3. For each topic the user has visited (tracked in localStorage as visited:{topicId}):
   a. Query local cache only (using Firestore's getDocsFromCache):
        messages where time < cutoff
        ordered by time ascending
        limit 200 (batch size to avoid memory spike)
   b. For each stale document returned:
        - Call Firestore's local cache clearance if available, OR
        - Simply ignore them (don't load into state).
   c. Repeat until no more stale documents are returned.
4. Update localStorage key `lastEviction` = now.
   Skip eviction if lastEviction was less than 24 hours ago.
```

### 10.3 Cache Behavior Summary

| Scenario | What Happens |
|---|---|
| Fresh app load, online | IndexedDB cache renders instantly → server sync patches any delta |
| Fresh app load, offline | IndexedDB cache renders; no server sync; fully functional read-only |
| Message older than 7 days | Not loaded into state on next app start; Firestore cache may still hold it |
| User scrolls up past cache | `load-more` query fetches from server, which also populates the local cache |
| User clears browser data | Cache is gone; next load fetches last 50 messages from server per topic |

### 10.4 Storage Estimates

At ~500 bytes per message document, 50 messages × 10 topics = ~250 KB of cached data. Even with a 30-day expiration, the cache stays well under 5 MB. IndexedDB quota is not a concern.

---

## 11. Internationalization (i18n)

### 11.1 Setup

SwanTalk uses `react-i18next` with namespace-based JSON locale files. The initial language is determined by: (1) `localStorage` override if the user has previously chosen, (2) browser `navigator.language`, (3) `APP_CONFIG.defaultLocale` fallback.

### 11.2 Locale Files

```
src/
└── locales/
    ├── en/
    │   └── translation.json
    └── zh/
        └── translation.json
```

**Sample `en/translation.json`:**

```json
{
  "app": {
    "name": "SwanTalk"
  },
  "auth": {
    "signIn": "Sign in with Google",
    "signOut": "Sign Out"
  },
  "topic": {
    "newTopic": "New Topic",
    "placeholder": "Topic name...",
    "unreadCount": "{{count}} new"
  },
  "chat": {
    "placeholder": "Type a message...",
    "send": "Send",
    "charCount": "{{current}} / {{max}}",
    "charLimitExceeded": "Message exceeds {{max}} character limit",
    "loadMore": "Load earlier messages"
  },
  "typing": {
    "one": "{{name}} is typing...",
    "many": "{{names}} are typing..."
  },
  "settings": {
    "language": "Language"
  }
}
```

**Sample `zh/translation.json`:**

```json
{
  "app": {
    "name": "SwanTalk"
  },
  "auth": {
    "signIn": "使用 Google 登录",
    "signOut": "退出登录"
  },
  "topic": {
    "newTopic": "新话题",
    "placeholder": "话题名称...",
    "unreadCount": "{{count}} 条新消息"
  },
  "chat": {
    "placeholder": "输入消息...",
    "send": "发送",
    "charCount": "{{current}} / {{max}}",
    "charLimitExceeded": "消息超出 {{max}} 字符限制",
    "loadMore": "加载更早的消息"
  },
  "typing": {
    "one": "{{name}} 正在输入...",
    "many": "{{names}} 正在输入..."
  },
  "settings": {
    "language": "语言"
  }
}
```

### 11.3 Language Switcher

A small toggle (e.g. `EN | 中文`) in the TopBar next to the user avatar. Tapping it switches `i18next.changeLanguage()` and persists the choice to `localStorage` key `swan-talk-lang`.

### 11.4 Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

function MessageInput() {
  const { t } = useTranslation();
  return (
    <textarea placeholder={t('chat.placeholder')} />
  );
}
```

All user-facing strings must go through `t()`. Message content itself is NOT translated — it's user-generated text.

---

## 12. Project Structure

```
src/
├── main.tsx                    # Entry point, renders <App>
├── App.tsx                     # AuthGate + ChatLayout routing
├── config.ts                   # APP_CONFIG: all tunable constants
├── firebase.ts                 # Firebase init, Firestore + Auth exports
├── i18n.ts                     # i18next initialization and config
│
├── locales/
│   ├── en/
│   │   └── translation.json    # English strings
│   └── zh/
│       └── translation.json    # Chinese strings
│
├── contexts/
│   ├── AuthContext.tsx          # Auth state provider + useAuth hook
│   └── ChatContext.tsx          # Topics, messages, typing, unread state
│
├── hooks/
│   ├── useTopics.ts            # Real-time topic list subscription
│   ├── useMessages.ts          # Smart sync: cache-first + real-time + eviction
│   ├── useTyping.ts            # Typing indicator read/write
│   └── useUnread.ts            # Unread count tracking
│
├── components/
│   ├── SignInScreen.tsx         # Google sign-in page
│   ├── TopBar.tsx              # App header, user menu, language toggle
│   ├── Sidebar.tsx             # Desktop: topic list + new topic form
│   ├── TopicBar.tsx            # Mobile: horizontal scrollable topic pills
│   ├── TopicItem.tsx           # Single topic row (used by Sidebar)
│   ├── ChatPanel.tsx           # Message list + input container
│   ├── MessageList.tsx         # Scrollable feed with load-more
│   ├── Message.tsx             # Single message with Markdown render
│   ├── TypingIndicator.tsx     # "X is typing..." bar
│   └── MessageInput.tsx        # Textarea + send button + char counter
│
├── lib/
│   ├── markdown.tsx            # ReactMarkdown config + custom renderers
│   ├── slug.ts                 # Topic name → slug utility
│   └── cacheEviction.ts        # IndexedDB cache cleanup logic
│
├── types/
│   └── index.ts                # Topic, Message, TypingUser interfaces
│
└── styles/
    └── highlight.css           # Code syntax highlighting theme
```

---

## 13. Firebase Project Setup Instructions

These steps are performed once by the developer, not by the coding agent.

1. Create a Firebase project at console.firebase.google.com.
2. Enable **Authentication → Sign-in method → Google**.
3. Enable **Cloud Firestore** in production mode.
4. Copy the Firebase config object into `src/firebase.ts`.
5. Deploy the security rules from Section 5 via the Firebase console or `firebase deploy --only firestore:rules`.
6. Enable **Firebase Hosting** and run `firebase init hosting` with `dist` as the public directory.

---

## 14. Firestore Spark Plan Limits (Relevant)

| Resource | Free Tier Limit | Our Expected Usage |
|---|---|---|
| Stored data | 1 GiB | ~50 MB (text-only messages) |
| Document reads | 50,000/day | ~10,000/day (10 users, real-time) |
| Document writes | 20,000/day | ~2,000/day (messages + typing) |
| Concurrent connections | 100 | 10 |

The app is well within Spark Plan limits for a 10-person group.

---

## 15. Implementation Order (Suggested)

| Phase | Scope | Deliverable |
|---|---|---|
| 1 | Firebase init, Auth, user profile write | Sign in with Google, see your name |
| 2 | App config (`config.ts`) + i18n setup with EN/ZH locale files | Language toggle works, config loaded |
| 3 | Topic CRUD, Sidebar (desktop) + TopicBar (mobile) | Create and browse topics on both layouts |
| 4 | Message send/receive, onSnapshot, smart sync, char limit | Core chat working with validation |
| 5 | Markdown rendering + code highlighting | Rich message display |
| 6 | Typing indicators | "X is typing..." |
| 7 | Unread badges | Numeric badges on topics / pills |
| 8 | Cache eviction logic | Stale message cleanup on app start |
| 9 | Responsive layout polish, dvh, scroll behavior, error states | Production-quality UX |

---

## 16. Open Questions / Future Considerations

- **Message editing/deletion:** Not in v1. When added, will require updating security rules to allow `update`/`delete` where `request.auth.uid == resource.data.sender`.
- **Image upload:** Can be added via Firebase Storage with a paste/drag-drop flow. Store the download URL in the Markdown content.
- **Push notifications:** Requires Firebase Cloud Messaging + a service worker. Out of scope for Spark Plan's zero-cost goal if Cloud Functions are needed.
- **User presence (online/offline):** Could use Firebase Realtime Database's `.info/connected` for accurate presence, but adds a second database. Deferred.
- **Additional languages:** The i18n system supports adding more locales by dropping a new folder under `src/locales/` (e.g. `ja/`, `ko/`) with no code changes.
