import { useCallback } from 'react';
import { useChatContext } from '../contexts/ChatContext';

const PREFIX = 'swan-talk-unread:';

export function useUnread() {
  const { dispatch, state } = useChatContext();

  const markRead = useCallback((topicId: string) => {
    localStorage.setItem(`${PREFIX}${topicId}`, new Date().toISOString());
    dispatch({ type: 'CLEAR_UNREAD', topicId });
  }, [dispatch]);

  const getLastRead = useCallback((topicId: string): Date | null => {
    const raw = localStorage.getItem(`${PREFIX}${topicId}`);
    return raw ? new Date(raw) : null;
  }, []);

  return {
    unreadCounts: state.unreadCounts,
    markRead,
    getLastRead,
  };
}
