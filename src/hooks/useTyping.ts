import { useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useChatContext } from '../contexts/ChatContext';
import { APP_CONFIG } from '../config';
import type { TypingUser } from '../types';

export function useTyping(topicId: string | null) {
  const { user } = useAuth();
  const { dispatch } = useChatContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!topicId) return;

    const typingRef = collection(db, 'topics', topicId, 'typing');
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      const users: TypingUser[] = snapshot.docs
        .filter((doc) => {
          if (doc.id === user?.uid) return false; // Exclude self
          const ts = doc.data().timestamp?.toDate?.();
          if (!ts) return false;
          return now - ts.getTime() < APP_CONFIG.typingStalenessMs;
        })
        .map((doc) => ({
          uid: doc.id,
          displayName: doc.data().displayName,
          timestamp: doc.data().timestamp,
        }));
      dispatch({ type: 'SET_TYPING_USERS', users });
    });

    return unsubscribe;
  }, [topicId, user?.uid, dispatch]);

  const startTyping = () => {
    if (!topicId || !user) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setDoc(doc(db, 'topics', topicId, 'typing', user.uid), {
        displayName: user.displayName,
        timestamp: serverTimestamp(),
      }).catch(console.error);
    }

    // Reset debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      stopTyping();
    }, APP_CONFIG.typingDebounceMs);
  };

  const stopTyping = () => {
    if (!topicId || !user) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    isTypingRef.current = false;
    deleteDoc(doc(db, 'topics', topicId, 'typing', user.uid)).catch(
      console.error
    );
  };

  return { startTyping, stopTyping };
}
