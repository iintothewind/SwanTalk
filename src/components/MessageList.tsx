import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { Message } from './Message';

const SCROLL_THRESHOLD = 80; // px from edge to consider "at top/bottom"

export function MessageList() {
  const { t } = useTranslation();
  const { state } = useChatContext();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? '';
  const { messages, activeTopicId } = state;
  const { loadMore, hasMore } = useMessages(activeTopicId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowScrollTop(scrollTop > SCROLL_THRESHOLD);
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > SCROLL_THRESHOLD);
  }, []);

  // Auto-scroll to bottom on new messages (only when already near bottom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - scrollTop - clientHeight <= SCROLL_THRESHOLD;
    if (!nearBottom) return;
    el.scrollTop = el.scrollHeight;
    el.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', () => { el.scrollTop = el.scrollHeight; }, { once: true });
      }
    });
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

  const scrollToTop = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = 0;
    // Re-anchor after any still-loading images shift the layout
    el.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', () => { el.scrollTop = 0; }, { once: true });
      }
    });
  };

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    // Re-anchor after any still-loading images increase scrollHeight
    el.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', () => { el.scrollTop = el.scrollHeight; }, { once: true });
      }
    });
  };

  if (!activeTopicId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a topic to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      <div
        ref={containerRef}
        onScroll={updateScrollButtons}
        className="h-full overflow-y-auto overflow-x-hidden flex flex-col py-2"
      >
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
          <Message key={message.id} message={message} currentUserId={currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Jump to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          title="Jump to top"
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l6 6a1 1 0 01-1.414 1.414L10 5.414 4.707 10.707A1 1 0 013.293 9.293l6-6A1 1 0 0110 3z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Jump to bottom */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          title="Jump to bottom"
          className="absolute bottom-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-6-6a1 1 0 011.414-1.414L10 14.586l5.293-5.293a1 1 0 011.414 1.414l-6 6A1 1 0 0110 17z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
