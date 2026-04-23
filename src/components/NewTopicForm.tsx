import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useChatContext } from '../contexts/ChatContext';
import { loadUsers, type RegisteredUser } from '../hooks/useUsers';
import { APP_CONFIG } from '../config';

const VALID_PATTERN = /^[a-zA-Z0-9_]*$/;

interface NewTopicFormProps {
  onDone?: () => void;
}

export function NewTopicForm({ onDone }: NewTopicFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dispatch } = useChatContext();

  const [name, setName] = useState('');
  const [access, setAccess] = useState<'public' | 'private'>('public');
  const [otherUsers, setOtherUsers] = useState<RegisteredUser[]>([]);
  const [selectedUIDs, setSelectedUIDs] = useState<Set<string>>(new Set());
  const [hasPrivateTopic, setHasPrivateTopic] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // Load all registered users (for visibility picker) and check if the
  // current user already owns a private topic, both in one pass.
  useEffect(() => {
    if (!user) return;
    Promise.all([
      loadUsers(),
      getDoc(doc(db, 'topics', user.uid)),
    ]).then(([allUsers, privateDoc]) => {
      setOtherUsers(allUsers.filter((u) => u.uid !== user.uid));
      setHasPrivateTopic(
        privateDoc.exists() && privateDoc.data()?.access === 'private'
      );
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!VALID_PATTERN.test(val)) return;
    if (val.length > APP_CONFIG.topicMaxLength) return;
    setName(val);
    setError('');
  };

  const toggleUID = (uid: string) => {
    setSelectedUIDs((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !user) return;

    if (access === 'private' && hasPrivateTopic) {
      setError(t('topic.privateExists'));
      return;
    }

    setCreating(true);
    setError('');
    try {
      // Private topic ID is forced to the owner's UID (enforced by rules too)
      const topicId = access === 'private' ? user.uid : name;

      const existing = await getDoc(doc(db, 'topics', topicId));
      if (existing.exists()) {
        setError(access === 'private' ? t('topic.privateExists') : t('topic.alreadyExists'));
        return;
      }

      // Public  → visibility only needs the owner; access is governed by access=='public'
      // Private → owner + explicitly selected users
      const visibility: string[] =
        access === 'public'
          ? [user.uid]
          : [user.uid, ...Array.from(selectedUIDs)];

      await setDoc(doc(db, 'topics', topicId), {
        name,
        owner: user.uid,
        ownerEmail: user.email ?? null,
        createTime: serverTimestamp(),
        access,
        status: 'active',
        visibility,
      });

      dispatch({ type: 'SET_ACTIVE_TOPIC', topicId });
      setName('');
      onDone?.();
    } catch (err) {
      console.error('Failed to create topic', err);
      setError(t('topic.createError'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-2 py-1 flex flex-col gap-2">
      {/* Topic name */}
      <input
        autoFocus
        type="text"
        value={name}
        onChange={handleChange}
        placeholder={t('topic.placeholder')}
        disabled={creating}
        className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white ${
          error
            ? 'border-red-400 focus:ring-red-300'
            : 'border-indigo-300 focus:ring-indigo-400'
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setName(''); onDone?.(); }
        }}
      />
      <div className="flex justify-between items-center px-0.5">
        {error
          ? <span className="text-xs text-red-500">{error}</span>
          : <span className="text-xs text-gray-400">{t('topic.hint')}</span>
        }
        <span className={`text-xs ${name.length >= APP_CONFIG.topicMaxLength ? 'text-red-400' : 'text-gray-400'}`}>
          {name.length}/{APP_CONFIG.topicMaxLength}
        </span>
      </div>

      {/* Public / Private toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAccess('public')}
          className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
            access === 'public'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
          }`}
        >
          {t('topic.public')}
        </button>
        <button
          type="button"
          onClick={() => { if (!hasPrivateTopic) setAccess('private'); }}
          disabled={hasPrivateTopic}
          title={hasPrivateTopic ? t('topic.privateExists') : undefined}
          className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
            access === 'private'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          🔒 {t('topic.private')}
        </button>
      </div>

      {hasPrivateTopic && (
        <p className="text-xs text-amber-600 px-0.5">{t('topic.privateExists')}</p>
      )}

      {/* Member picker — only for private topics */}
      {access === 'private' && !hasPrivateTopic && (
        <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
          <p className="text-gray-500 px-2 pt-2 pb-1 font-medium">
            {t('topic.selectMembers')}
          </p>
          {/* Current user always included */}
          <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border-t border-gray-100">
            <input type="checkbox" checked readOnly className="accent-indigo-500 shrink-0" />
            <span className="text-gray-500 truncate">
              {user?.email ? `${user.displayName}(${user.email})` : user?.displayName}
              <span className="ml-1 text-gray-400">({t('topic.you')})</span>
            </span>
          </div>
          {otherUsers.length === 0 ? (
            <p className="text-gray-400 px-2 py-1.5 border-t border-gray-100">
              {t('topic.noOtherUsers')}
            </p>
          ) : (
            otherUsers.map((u) => (
              <label
                key={u.uid}
                className="flex items-center gap-2 px-2 py-1.5 border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUIDs.has(u.uid)}
                  onChange={() => toggleUID(u.uid)}
                  className="accent-indigo-500 shrink-0"
                />
                <span className="text-gray-700 truncate">
                  {u.email ? `${u.displayName}(${u.email})` : u.displayName}
                </span>
              </label>
            ))
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!name || creating}
        className="w-full py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
      >
        {creating ? t('topic.creating') : t('topic.create')}
      </button>
    </form>
  );
}
