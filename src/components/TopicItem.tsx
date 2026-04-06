import { useChatContext } from '../contexts/ChatContext';
import type { Topic } from '../types';

interface TopicItemProps {
  topic: Topic;
  unreadCount: number;
  isActive: boolean;
  onClick: () => void;
}

export function TopicItem({ topic, unreadCount, isActive, onClick }: TopicItemProps) {
  const { dispatch } = useChatContext();

  const handleClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOPIC', topicId: topic.id });
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors ${
        isActive
          ? 'bg-indigo-100 text-indigo-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="truncate">
        <span className="text-gray-400 mr-1">#</span>
        {topic.name}
      </span>
      {unreadCount > 0 && (
        <span className="bg-indigo-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center shrink-0">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
