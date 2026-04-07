import { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useChatContext } from '../contexts/ChatContext';
import { useTyping } from '../hooks/useTyping';
import { APP_CONFIG } from '../config';

export function MessageInput() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, dispatch } = useChatContext();
  const { activeTopicId } = state;
  const { startTyping, stopTyping } = useTyping(activeTopicId);

  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = content.length;
  const overLimit = charCount > APP_CONFIG.maxMessageLength;

  const sendMessage = async () => {
    if (!user || !activeTopicId) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    if (trimmed.length > APP_CONFIG.maxMessageLength) {
      setError(t('chat.charLimitExceeded', { max: APP_CONFIG.maxMessageLength }));
      return;
    }

    setError('');
    setContent('');
    stopTyping();

    // Optimistic UI
    const tempId = `optimistic-${Date.now()}`;
    dispatch({
      type: 'APPEND_MESSAGE',
      message: {
        id: tempId,
        sender: user.uid,
        senderName: user.displayName,
        senderPhoto: user.photoURL,
        senderEmail: user.email,
        content: trimmed,
        time: null,
        isOptimistic: true,
      },
    });

    try {
      const docRef = await addDoc(
        collection(db, 'topics', activeTopicId, 'messages'),
        {
          sender: user.uid,
          senderName: user.displayName,
          senderPhoto: user.photoURL,
          senderEmail: user.email ?? null,
          content: trimmed,
          time: serverTimestamp(),
        }
      );

      // Replace optimistic with server-confirmed
      dispatch({
        type: 'REPLACE_OPTIMISTIC',
        tempId,
        message: {
          id: docRef.id,
          sender: user.uid,
          senderName: user.displayName,
          senderPhoto: user.photoURL,
          senderEmail: user.email,
          content: trimmed,
          time: null, // Will be updated by onSnapshot
        },
      });
    } catch (err) {
      console.error('Failed to send message', err);
      // Remove the optimistic message on failure
      dispatch({
        type: 'SET_MESSAGES',
        messages: state.messages.filter((m) => m.id !== tempId),
      });
    }

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      startTyping();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (error) setError('');
    startTyping();
  };

  if (!activeTopicId) return null;

  return (
    <div className="border-t border-gray-200 bg-white p-3 flex flex-col gap-1 shrink-0">
      {error && (
        <p className="text-xs text-red-500 px-1">{error}</p>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-32 overflow-y-auto leading-relaxed"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
          onBlur={() => {
            // When the virtual keyboard dismisses on mobile, some browsers leave
            // the window scrolled down. Reset after a brief delay so the browser
            // has time to resize the viewport before we correct the scroll.
            setTimeout(() => window.scrollTo(0, 0), 100);
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!content.trim() || overLimit}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {t('chat.send')}
        </button>
      </div>
      <div className={`text-xs text-right ${overLimit ? 'text-red-500' : 'text-gray-400'}`}>
        {t('chat.charCount', { current: charCount, max: APP_CONFIG.maxMessageLength })}
      </div>
    </div>
  );
}
