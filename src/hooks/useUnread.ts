import { useChatContext } from '../contexts/ChatContext';

const PREFIX = 'swan-talk-unread:';

export function useUnread() {
  const { dispatch, state } = useChatContext();

  const markRead = (topicId: string) => {
    localStorage.setItem(`${PREFIX}${topicId}`, new Date().toISOString());
    dispatch({ type: 'CLEAR_UNREAD', topicId });
  };

  const getLastRead = (topicId: string): Date | null => {
    const raw = localStorage.getItem(`${PREFIX}${topicId}`);
    return raw ? new Date(raw) : null;
  };

  const handleNewMessage = (topicId: string, activeTopicId: string | null) => {
    if (topicId !== activeTopicId) {
      dispatch({ type: 'INCREMENT_UNREAD', topicId });
    }
  };

  return {
    unreadCounts: state.unreadCounts,
    markRead,
    getLastRead,
    handleNewMessage,
  };
}
