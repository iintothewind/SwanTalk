import { useEffect } from 'react';
import { collection, onSnapshot, where, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { loadUsers } from './useUsers';
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

  useEffect(() => {
    if (!user) return;

    const topicsRef = collection(db, 'topics');

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

    const publicTopics = new Map<string, Topic>();
    const privateTopics = new Map<string, Topic>();
    const emailMap = new Map<string, string>();

    const merge = () => {
      const merged = [...publicTopics.values(), ...privateTopics.values()]
        .sort((a, b) => {
          const ta = a.createTime?.toMillis?.() ?? 0;
          const tb = b.createTime?.toMillis?.() ?? 0;
          return ta - tb;
        })
        .map((t) => ({
          ...t,
          ownerEmail: t.ownerEmail ?? emailMap.get(t.owner),
        }));
      dispatch({ type: 'SET_TOPICS', topics: merged });
      dispatch({ type: 'CLEAR_ACTIVE_IF_GONE', topicIds: new Set(merged.map((t) => t.id)) });
    };

    let unsubPublic: (() => void) | undefined;
    let unsubPrivate: (() => void) | undefined;

    loadUsers().then((users) => {
      users.forEach((u) => { if (u.email) emailMap.set(u.uid, u.email); });

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
