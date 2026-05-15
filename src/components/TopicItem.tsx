import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { ManageMembersPanel } from './ManageMembersPanel';
import { MembersToggleButton } from './MembersToggleButton';
import type { Topic } from '../types';

interface TopicItemProps {
  topic: Topic;
  unreadCount: number;
  isActive: boolean;
  currentUserId: string;
  onClick: (topicId: string) => void;
}

export const TopicItem = memo(function TopicItem({
  topic, unreadCount, isActive, currentUserId, onClick,
}: TopicItemProps) {
  const { t } = useTranslation();
  const { dispatch } = useChatContext();
  const [managing, setManaging] = useState(false);
  const [viewing, setViewing] = useState(false);

  const isOwner = topic.access === 'private' && topic.owner === currentUserId;
  const isMember = topic.access === 'private' && !isOwner && topic.visibility.includes(currentUserId);

  const handleClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: topic.id });
    onClick(topic.id);
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
            <MembersToggleButton
              expanded={managing}
              mode="manage"
              onClick={(e) => { e.stopPropagation(); setManaging((v) => !v); }}
              className={`p-0.5 hover:text-indigo-600 transition-opacity ${
                managing
                  ? 'text-indigo-600 opacity-100'
                  : 'text-gray-400 opacity-0 group-hover:opacity-100'
              }`}
              title={managing ? t('topic.close') : t('topic.manageMembers')}
            />
          )}
          {isMember && (
            <MembersToggleButton
              expanded={viewing}
              mode="view"
              onClick={(e) => { e.stopPropagation(); setViewing((v) => !v); }}
              className={`p-0.5 hover:text-indigo-600 transition-opacity ${
                viewing
                  ? 'text-indigo-600 opacity-100'
                  : 'text-gray-400 opacity-0 group-hover:opacity-100'
              }`}
              title={viewing ? t('topic.close') : t('topic.viewMembers')}
            />
          )}
        </div>
      </div>

      {managing && (
        <ManageMembersPanel
          topic={topic}
          onClose={() => setManaging(false)}
          hideCloseControls
        />
      )}
      {viewing && (
        <ManageMembersPanel
          topic={topic}
          onClose={() => setViewing(false)}
          readOnly
          hideCloseControls
        />
      )}
    </>
  );
});
