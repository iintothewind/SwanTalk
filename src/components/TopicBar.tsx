import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { NewTopicForm } from './NewTopicForm';
import { ManageMembersPanel } from './ManageMembersPanel';
import { MembersToggleButton } from './MembersToggleButton';
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
    setShowNewForm(false);
    setManagingTopic(null);
  };

  return (
    <div className="md:hidden border-b border-gray-200 bg-white shrink-0">
      <div
        className="flex gap-2 px-3 py-2 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {state.topics.map((topic) => {
          const isActive = topic.id === state.activeTopicId;
          const unread = unreadCounts[topic.id] ?? 0;
          const isOwner = topic.access === 'private' && topic.owner === user?.uid;
          const isMember = topic.access === 'private' && !isOwner && topic.visibility.includes(user?.uid ?? '');
          return (
            <div key={topic.id} className="relative flex-shrink-0 flex items-center">
              <button
                onClick={() => handleTopicClick(topic.id)}
                title={topic.ownerEmail}
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
                <MembersToggleButton
                  expanded={managingTopic?.id === topic.id}
                  mode="manage"
                  onClick={() => {
                    setShowNewForm(false);
                    setManagingTopic((current) =>
                      current?.id === topic.id ? null : topic
                    );
                  }}
                  className="ml-1 p-1 text-indigo-300 hover:text-white transition-colors"
                  title={managingTopic?.id === topic.id ? t('topic.close') : t('topic.manageMembers')}
                />
              )}
              {isMember && isActive && (
                <MembersToggleButton
                  expanded={managingTopic?.id === topic.id}
                  mode="view"
                  onClick={() => {
                    setShowNewForm(false);
                    setManagingTopic((current) =>
                      current?.id === topic.id ? null : topic
                    );
                  }}
                  className="ml-1 p-1 text-indigo-300 hover:text-white transition-colors"
                  title={managingTopic?.id === topic.id ? t('topic.close') : t('topic.viewMembers')}
                />
              )}
            </div>
          );
        })}
        <button
          onClick={() => {
            setShowNewForm((v) => !v);
            setManagingTopic(null);
          }}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
            showNewForm
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
          title={showNewForm ? t('topic.cancelNewTopic') : t('topic.newTopic')}
          aria-expanded={showNewForm}
        >
          {showNewForm ? '-' : '+'}
        </button>
      </div>

      {showNewForm && (
        <div className="p-2 border-t border-gray-100">
          <NewTopicForm onDone={() => setShowNewForm(false)} />
        </div>
      )}

      {managingTopic && (
        <div className="border-t border-gray-100 pt-2">
          <ManageMembersPanel
            key={managingTopic.id}
            topic={managingTopic}
            onClose={() => setManagingTopic(null)}
            readOnly={managingTopic.owner !== user?.uid}
            hideCloseControls
          />
        </div>
      )}
    </div>
  );
}
