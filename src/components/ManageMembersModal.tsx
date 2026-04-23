import { useState, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config';
import type { Topic } from '../types';

const MAX_MEMBERS = 10;
const VALID_PATTERN = /^[a-zA-Z0-9_]*$/;

interface RegisteredUser {
  uid: string;
  displayName: string;
  email?: string;
}

function userLabel(u: RegisteredUser): string {
  return u.email ? `${u.displayName}(${u.email})` : u.displayName;
}

interface ManageMembersModalProps {
  topic: Topic;
  onClose: () => void;
  readOnly?: boolean;
}

export function ManageMembersModal({ topic, onClose, readOnly = false }: ManageMembersModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [selectedUIDs, setSelectedUIDs] = useState<Set<string>>(new Set(topic.visibility));
  const [topicName, setTopicName] = useState(topic.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'users')).then((snap) => {
      setAllUsers(
        snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName ?? 'Unknown',
          email: d.data().email,
        }))
      );
    });
  }, []);

  // In read-only mode only show users who are actually members.
  const visibleUsers = readOnly
    ? allUsers.filter((u) => topic.visibility.includes(u.uid))
    : allUsers;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!VALID_PATTERN.test(val)) return;
    if (val.length > APP_CONFIG.topicMaxLength) return;
    setTopicName(val);
    setError('');
  };

  const toggle = (uid: string) => {
    if (uid === user?.uid) return; // owner is always included
    setSelectedUIDs((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        if (next.size >= MAX_MEMBERS) {
          setError(t('topic.maxMembersReached'));
          return prev;
        }
        next.add(uid);
      }
      setError('');
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || !topicName) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'topics', topic.id), {
        name: topicName,
        visibility: Array.from(selectedUIDs),
      });
      onClose();
    } catch (err) {
      console.error('Failed to update topic', err);
      setError(t('topic.saveMembersError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-80 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-sm">
            🔒 {topic.name} — {readOnly ? t('topic.viewMembers') : t('topic.manageMembers')}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col">
          {/* Rename section — owner only */}
          {!readOnly && (
            <div className="px-4 py-3 border-b border-gray-100">
              <label className="block text-xs text-gray-500 mb-1">{t('topic.topicName')}</label>
              <input
                type="text"
                value={topicName}
                onChange={handleNameChange}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* Member list */}
          <div className="divide-y divide-gray-50">
            {visibleUsers.map((u) => {
              const isSelf = u.uid === user?.uid;
              const checked = selectedUIDs.has(u.uid);
              if (readOnly) {
                return (
                  <div key={u.uid} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${isSelf ? 'bg-gray-50' : ''}`}>
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span className="truncate text-gray-700">
                      {isSelf ? `${userLabel(u)} (${t('topic.you')})` : userLabel(u)}
                    </span>
                    {u.uid === topic.owner && (
                      <span className="ml-auto text-xs text-gray-400 shrink-0">{t('topic.ownerLabel')}</span>
                    )}
                  </div>
                );
              }
              return (
                <label
                  key={u.uid}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    isSelf ? 'bg-gray-50 cursor-default' : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(u.uid)}
                    disabled={isSelf}
                    className="accent-indigo-500 shrink-0"
                  />
                  <span className="truncate text-gray-700">
                    {isSelf
                      ? `${userLabel(u)} (${t('topic.you')})`
                      : userLabel(u)
                    }
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col gap-2">
          {readOnly ? (
            <button
              onClick={onClose}
              className="w-full py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('topic.close')}
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t('topic.members')}: {selectedUIDs.size} / {MAX_MEMBERS}</span>
                {error && <span className="text-red-500">{error}</span>}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !topicName}
                className="w-full py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors"
              >
                {saving ? t('topic.savingMembers') : t('topic.saveMembers')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
