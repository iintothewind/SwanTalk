import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';

export function ChatPanel() {
  return (
    <main className="flex-1 flex flex-col min-h-0 min-w-0">
      <MessageList />
      <TypingIndicator />
      <MessageInput />
    </main>
  );
}
