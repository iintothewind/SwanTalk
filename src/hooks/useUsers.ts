import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface RegisteredUser {
  uid: string;
  displayName: string;
  email?: string;
}

let _cache: RegisteredUser[] | null = null;
let _inflight: Promise<RegisteredUser[]> | null = null;

// Single fetch across the entire session; subsequent calls return from cache immediately.
export function loadUsers(): Promise<RegisteredUser[]> {
  if (_cache) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = getDocs(collection(db, 'users')).then((snap) => {
      _cache = snap.docs.map((d) => ({
        uid: d.id,
        displayName: (d.data().displayName as string) ?? 'Unknown',
        email: d.data().email as string | undefined,
      }));
      _inflight = null;
      return _cache;
    });
  }
  return _inflight;
}

// React hook wrapper — returns cached array synchronously if already loaded.
export function useUsers(): RegisteredUser[] {
  const [users, setUsers] = useState<RegisteredUser[]>(_cache ?? []);
  useEffect(() => {
    if (_cache) { setUsers(_cache); return; }
    loadUsers().then(setUsers);
  }, []);
  return users;
}
