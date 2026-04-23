import { useEffect, useRef } from 'react';
import { collection, onSnapshot, where, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import type { Topic } from '../types';

function docToTopic(doc: { id: string; data: () => Record<string, unknown> }): Topic {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name as string,
    owner: (d.owner ?? d.createdBy ?? '') as string,
    ownerEmail: (d.ownerEmail as string | undefined) ?? undefined,
    createTime: (d.createTime ?? d.createdAt ?? null) as Topic['createTime'],
    access: ((d.access as string) === 'private' ? 'private' : 'public') as 'public' | 'private',
    status: 'active' as const,
    visibility: (d.visibility as string[]) ?? [],
  };
}

export function useTopics() {
  const { dispatch } = useChatContext();
  const { user } = useAuth();
  // UID → email map, populated once per session for owner email enrichment
  const emailMap = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;

    const topicsRef = collection(db, 'topics');

    // Two queries that together cover everything the user can access:
    //   1. All active public topics (readable by any authenticated user per rules)
    //   2. Active private topics where this user is in the visibility array
    // Using two listeners and merging client-side avoids adding the user uid
    // to every public topic's visibility array.
    const publicQuery = query(
      topicsRef,
      where('access', '==', 'public'),
      where('status', '==', 'active')
    );
    const privateQuery = query(
      topicsRef,
      where('access', '==', 'private'),
      where('visibility', 'array-contains', user.uid),
      where('status', '==', 'active')
    );

    // Merge both result sets, sort by createTime, dispatch.
    const publicTopics = new Map<string, Topic>();
    const privateTopics = new Map<string, Topic>();

    const merge = () => {
      const merged = [...publicTopics.values(), ...privateTopics.values()]
        .sort((a, b) => {
          const ta = a.createTime?.toMillis?.() ?? 0;
          const tb = b.createTime?.toMillis?.() ?? 0;
          return ta - tb;
        })
        .map((t) => ({
          ...t,
          ownerEmail: t.ownerEmail ?? emailMap.current.get(t.owner),
        }));
      dispatch({ type: 'SET_TOPICS', topics: merged });
      // If the active topic is no longer in the list, clear it so the message
      // panel doesn't keep showing a topic the user can no longer access.
      dispatch({ type: 'CLEAR_ACTIVE_IF_GONE', topicIds: new Set(merged.map((t) => t.id)) });
    };

    // Fetch user profiles to fill in ownerEmail for legacy topics that
    // were created before ownerEmail was stored on the topic document.
    const usersPromise = emailMap.current.size > 0
      ? Promise.resolve()
      : getDocs(collection(db, 'users')).then((snap) => {
          snap.docs.forEach((d) => {
            const email = d.data().email as string | undefined;
            if (email) emailMap.current.set(d.id, email);
          });
        });

    let unsubPublic: () => void;
    let unsubPrivate: () => void;

    usersPromise.then(() => {
      unsubPublic = onSnapshot(publicQuery, (snap) => {
        publicTopics.clear();
        snap.docs.forEach((d) => publicTopics.set(d.id, docToTopic(d)));
        merge();
      });

      unsubPrivate = onSnapshot(privateQuery, (snap) => {
        privateTopics.clear();
        snap.docs.forEach((d) => privateTopics.set(d.id, docToTopic(d)));
        merge();
      });
    });

    return () => {
      unsubPublic?.();
      unsubPrivate?.();
    };
  }, [dispatch, user]);
}
