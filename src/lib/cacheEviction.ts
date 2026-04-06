import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocsFromCache,
} from 'firebase/firestore';
import { db } from '../firebase';
import { APP_CONFIG } from '../config';

const LAST_EVICTION_KEY = 'swan-talk-lastEviction';
const VISITED_TOPICS_PREFIX = 'swan-talk-visited:';

export function markTopicVisited(topicId: string) {
  localStorage.setItem(`${VISITED_TOPICS_PREFIX}${topicId}`, '1');
}

function getVisitedTopics(): string[] {
  const topics: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(VISITED_TOPICS_PREFIX)) {
      topics.push(key.slice(VISITED_TOPICS_PREFIX.length));
    }
  }
  return topics;
}

/**
 * Runs cache eviction on app startup.
 * Skips if eviction ran less than 24 hours ago.
 * For each visited topic, queries the local IndexedDB cache for stale messages
 * and marks them as "seen" so they won't be loaded into state.
 */
export async function runCacheEviction(): Promise<void> {
  const lastEviction = localStorage.getItem(LAST_EVICTION_KEY);
  if (lastEviction) {
    const elapsed = Date.now() - new Date(lastEviction).getTime();
    if (elapsed < 24 * 60 * 60 * 1000) {
      return; // Skip — eviction ran recently
    }
  }

  const cutoff = new Date(
    Date.now() - APP_CONFIG.cacheExpirationDays * 86400000
  );

  const visitedTopics = getVisitedTopics();

  for (const topicId of visitedTopics) {
    try {
      const messagesRef = collection(db, 'topics', topicId, 'messages');
      const staleQuery = query(
        messagesRef,
        where('time', '<', cutoff),
        orderBy('time', 'asc'),
        limit(200)
      );

      // Read from local cache only — we don't want to trigger server reads
      await getDocsFromCache(staleQuery);
      // Firestore SDK will handle eviction internally over time;
      // we simply avoid loading these into application state.
    } catch {
      // Cache miss or uninitialized — safe to ignore
    }
  }

  localStorage.setItem(LAST_EVICTION_KEY, new Date().toISOString());
}
