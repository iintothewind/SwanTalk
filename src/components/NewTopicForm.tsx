import { useState } from 'react';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useChatContext } from '../contexts/ChatContext';
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
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Silently reject characters that don't match the allowed set
    if (!VALID_PATTERN.test(val)) return;
    if (val.length > APP_CONFIG.topicMaxLength) return;
    setName(val);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !user) return;

    setCreating(true);
    setError('');
    try {
      const topicId = name; // name already matches [a-zA-Z0-9_], use directly as ID

      const existing = await getDoc(doc(db, 'topics', topicId));
      if (existing.exists()) {
        setError(t('topic.alreadyExists'));
        return;
      }

      await setDoc(doc(db, 'topics', topicId), {
        name,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
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
    <form onSubmit={handleSubmit} className="px-2 py-1 flex flex-col gap-1">
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
          if (e.key === 'Escape') {
            setName('');
            onDone?.();
          }
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
    </form>
  );
}
