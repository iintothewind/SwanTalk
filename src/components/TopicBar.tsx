import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { NewTopicForm } from './NewTopicForm';
import { ManageMembersModal } from './ManageMembersModal';
import { useUnread } from '../hooks/useUnread';
import type { Topic } from '../types';

export function TopicBar() {
  const { t } = useTranslation();
  const { state, dispatch } = useChatContext();
  const { user } = useAuth();
  const { unreadCounts, markRead } = useUnread();
  const [showNewForm, setShowNewForm] = useState(false);
  const [managingTopic, setManagingTopic] = useState<Topic | null>(null);

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
            const isOwner = topic.access === 'private' && topic.owner === user?.uid;
            return (
              <div key={topic.id} className="relative flex-shrink-0 flex items-center">
                <button
                  onClick={() => handleTopicClick(topic.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${isOwner && isActive ? 'pr-1' : ''}`}
                >
                  {topic.access === 'private' ? '🔒' : '#'}{topic.name}
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
                {isOwner && isActive && (
                  <button
                    onClick={() => setManagingTopic(topic)}
                    className="ml-1 p-1 text-indigo-300 hover:text-white transition-colors"
                    title={t('topic.manageMembers')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
                    </svg>
                  </button>
                )}
              </div>
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

      {managingTopic && (
        <ManageMembersModal topic={managingTopic} onClose={() => setManagingTopic(null)} />
      )}
    </div>
  );
}
