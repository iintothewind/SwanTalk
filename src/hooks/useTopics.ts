import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useChatContext } from '../contexts/ChatContext';
import type { Topic } from '../types';

export function useTopics() {
  const { dispatch } = useChatContext();

  useEffect(() => {
    const q = query(collection(db, 'topics'), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topics: Topic[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        createdBy: doc.data().createdBy,
        createdAt: doc.data().createdAt,
      }));
      dispatch({ type: 'SET_TOPICS', topics });
    });

    return unsubscribe;
  }, [dispatch]);
}
