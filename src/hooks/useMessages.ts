import { useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { markTopicVisited } from '../lib/cacheEviction';
import { fireNotification } from '../lib/notifications';
import { APP_CONFIG } from '../config';
import type { Message } from '../types';

function docToMessage(doc: QueryDocumentSnapshot<DocumentData>): Message {
  const data = doc.data();
  return {
    id: doc.id,
    sender: data.sender,
    senderName: data.senderName,
    senderPhoto: data.senderPhoto,
    senderEmail: data.senderEmail ?? undefined,
    content: data.content,
    time: data.time,
  };
}

export function useMessages(topicId: string | null) {
  const { dispatch, state } = useChatContext();
  const { user } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const oldestDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isInitialSnapshot = useRef(true);
  // Ref so the snapshot callback always sees the latest topics without needing
  // to be recreated (adding state to the dep array would re-subscribe on every change).
  const topicsRef = useRef(state.topics);
  useEffect(() => { topicsRef.current = state.topics; }, [state.topics]);

  useEffect(() => {
    if (!topicId) return;

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    isInitialSnapshot.current = true;
    markTopicVisited(topicId);

    const messagesRef = collection(db, 'topics', topicId, 'messages');
    const q = query(
      messagesRef,
      orderBy('time', 'desc'),
      limit(APP_CONFIG.messagesPerPage)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialSnapshot.current) {
        isInitialSnapshot.current = false;
        // Initial load: reverse for chronological order
        const docs = [...snapshot.docs].reverse();
        oldestDocRef.current = docs[0] ?? null;
        const messages = docs.map(docToMessage);
        dispatch({ type: 'SET_MESSAGES', messages });
      } else {
        // Real-time updates: only handle new messages
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const message = docToMessage(change.doc);
            dispatch({ type: 'APPEND_MESSAGE', message });

            // Notify if the message is from someone else and tab is not focused
            if (message.sender !== user?.uid) {
              const topic = topicsRef.current.find((t) => t.id === topicId);
              const topicLabel = topic ? `#${topic.name}` : 'SwanTalk';
              fireNotification(
                `${message.senderName} · ${topicLabel}`,
                message.content,
                message.senderPhoto || undefined,
              );
            }
          }
        });
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [topicId, dispatch]);

  const loadMore = async () => {
    if (!topicId || !oldestDocRef.current) return;

    const messagesRef = collection(db, 'topics', topicId, 'messages');
    const q = query(
      messagesRef,
      orderBy('time', 'desc'),
      startAfter(oldestDocRef.current),
      limit(APP_CONFIG.messagesPerPage)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const docs = [...snapshot.docs].reverse();
    oldestDocRef.current = docs[0];
    const older = docs.map(docToMessage);
    dispatch({ type: 'PREPEND_MESSAGES', messages: older });
  };

  const hasMore = state.messages.length >= APP_CONFIG.messagesPerPage;

  return { loadMore, hasMore };
}
