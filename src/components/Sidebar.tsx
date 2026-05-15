import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { TopicItem } from './TopicItem';
import { NewTopicForm } from './NewTopicForm';
import { useUnread } from '../hooks/useUnread';

export function Sidebar() {
  const { t } = useTranslation();
  const { state } = useChatContext();
  const { user } = useAuth();
  const { unreadCounts, markRead } = useUnread();
  const [showNewForm, setShowNewForm] = useState(false);
  const currentUserId = user?.uid ?? '';

  const handleTopicClick = useCallback((topicId: string) => {
    markRead(topicId);
  }, [markRead]);

  return (
    <aside className="hidden md:flex flex-col w-[280px] border-r border-gray-200 bg-gray-50 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Topics
        </span>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className={`text-xl leading-none font-bold transition-colors ${
            showNewForm
              ? 'text-red-500 hover:text-red-700'
              : 'text-indigo-500 hover:text-indigo-700'
          }`}
          title={showNewForm ? t('topic.cancelNewTopic') : t('topic.newTopic')}
          aria-expanded={showNewForm}
        >
          {showNewForm ? '-' : '+'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {showNewForm && (
          <NewTopicForm onDone={() => setShowNewForm(false)} />
        )}
        {state.topics.map((topic) => (
          <TopicItem
            key={topic.id}
            topic={topic}
            isActive={topic.id === state.activeTopicId}
            unreadCount={unreadCounts[topic.id] ?? 0}
            currentUserId={currentUserId}
            onClick={handleTopicClick}
          />
        ))}
        {state.topics.length === 0 && !showNewForm && (
          <p className="text-xs text-gray-400 text-center mt-4">
            No topics yet. Create one!
          </p>
        )}
      </div>
    </aside>
  );
}
