import { MarkdownContent } from '../lib/markdown';
import { formatMessageTime, formatMessageTimeFull } from '../lib/time';
import type { Message as MessageType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const { user } = useAuth();
  const isOwn = message.sender === user?.uid;
  const isOptimistic = message.isOptimistic;

  const msgDate = message.time?.toDate
    ? message.time.toDate()
    : message.time
    ? new Date(message.time as unknown as string)
    : null;
  const timeStr = msgDate ? formatMessageTime(msgDate) : '';
  const timeFull = msgDate ? formatMessageTimeFull(msgDate) : '';

  return (
    <div className={`flex gap-2 px-4 py-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {message.senderPhoto ? (
        <img
          src={message.senderPhoto}
          alt={message.senderName}
          className="w-8 h-8 rounded-full shrink-0 mt-1"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0 mt-1">
          {message.senderName?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-baseline gap-2">
          {!isOwn && (
            <span className="text-xs font-semibold text-gray-600">
              {message.senderName}
            </span>
          )}
          <span
            className="text-xs text-gray-400 cursor-default"
            title={timeFull}
          >
            {timeStr}
          </span>
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? `bg-indigo-600 text-white rounded-tr-sm ${isOptimistic ? 'opacity-60' : ''}`
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          <div className={`prose prose-sm max-w-none ${isOwn ? 'prose-invert' : ''}`}>
            <MarkdownContent content={message.content} />
          </div>
        </div>
      </div>
    </div>
  );
}
