import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { ManageMembersModal } from './ManageMembersModal';
import type { Topic } from '../types';

interface TopicItemProps {
  topic: Topic;
  unreadCount: number;
  isActive: boolean;
  onClick: () => void;
}

export function TopicItem({ topic, unreadCount, isActive, onClick }: TopicItemProps) {
  const { t } = useTranslation();
  const { dispatch } = useChatContext();
  const { user } = useAuth();
  const [managing, setManaging] = useState(false);
  const [viewing, setViewing] = useState(false);

  const isOwner = topic.access === 'private' && topic.owner === user?.uid;
  const isMember = topic.access === 'private' && !isOwner && topic.visibility.includes(user?.uid ?? '');

  const handleClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: topic.id });
    onClick();
  };

  return (
    <>
      <div
        className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors group ${
          isActive
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <button className="flex-1 flex items-center gap-1 min-w-0" onClick={handleClick} title={topic.ownerEmail}>
          <span className="text-gray-400 shrink-0">
            {topic.access === 'private' ? '🔒' : '#'}
          </span>
          <span className="truncate">{topic.name}</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {unreadCount > 0 && (
            <span className="bg-indigo-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); setManaging(true); }}
              className="p-0.5 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('topic.manageMembers')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
              </svg>
            </button>
          )}
          {isMember && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewing(true); }}
              className="p-0.5 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('topic.viewMembers')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {managing && (
        <ManageMembersModal topic={topic} onClose={() => setManaging(false)} />
      )}
      {viewing && (
        <ManageMembersModal topic={topic} onClose={() => setViewing(false)} readOnly />
      )}
    </>
  );
}
