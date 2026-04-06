import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { NewTopicForm } from './NewTopicForm';
import { useUnread } from '../hooks/useUnread';

export function TopicBar() {
  const { t } = useTranslation();
  const { state, dispatch } = useChatContext();
  const { unreadCounts, markRead } = useUnread();
  const [showNewForm, setShowNewForm] = useState(false);

  const handleTopicClick = (topicId: string) => {
    dispatch({ type: 'SET_ACTIVE_TOPIC', topicId });
    markRead(topicId);
  };

  return (
    <div className="md:hidden border-b border-gray-200 bg-white shrink-0">
      {showNewForm ? (
        <div className="p-2">
          <NewTopicForm onDone={() => setShowNewForm(false)} />
        </div>
      ) : (
        <div
          className="flex gap-2 px-3 py-2 overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {state.topics.map((topic) => {
            const isActive = topic.id === state.activeTopicId;
            const unread = unreadCounts[topic.id] ?? 0;
            return (
              <button
                key={topic.id}
                onClick={() => handleTopicClick(topic.id)}
                className={`relative flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                #{topic.name}
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setShowNewForm(true)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            title={t('topic.newTopic')}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
