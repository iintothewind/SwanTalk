import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { useMessages } from '../hooks/useMessages';
import { Message } from './Message';

export function MessageList() {
  const { t } = useTranslation();
  const { state } = useChatContext();
  const { messages, activeTopicId } = state;
  const { loadMore, hasMore } = useMessages(activeTopicId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Preserve scroll position when prepending older messages
  const handleLoadMore = async () => {
    if (!containerRef.current) return;
    prevScrollHeight.current = containerRef.current.scrollHeight;
    await loadMore();
    if (containerRef.current) {
      const diff = containerRef.current.scrollHeight - prevScrollHeight.current;
      containerRef.current.scrollTop = diff;
    }
  };

  if (!activeTopicId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a topic to start chatting
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto flex flex-col py-2">
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={handleLoadMore}
            className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline"
          >
            {t('chat.loadMore')}
          </button>
        </div>
      )}
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
