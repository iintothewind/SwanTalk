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

  // --- Topics ---
  topicMaxLength: 20,            // Max characters for a topic name (a-z, A-Z, 0-9, _)

  // --- Time Display ---
  // Format for messages sent today. Uses Intl.DateTimeFormat option tokens.
  timeFormatToday: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } as Intl.DateTimeFormatOptions,
  // Format for messages sent on a previous day (date + time).
  timeFormatPastDay: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } as Intl.DateTimeFormatOptions,

  // --- Session ---
  sessionDurationDays: 7,        // Auto sign-out after this many days of inactivity

  // --- Firebase ---
  firestorePersistence: true,    // Enable IndexedDB persistence (set false for debugging)
} as const;

export type AppConfig = typeof APP_CONFIG;
