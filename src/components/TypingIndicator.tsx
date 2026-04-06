import { useTranslation } from 'react-i18next';
import { useChatContext } from '../contexts/ChatContext';

export function TypingIndicator() {
  const { t } = useTranslation();
  const { state } = useChatContext();
  const { typingUsers } = state;

  if (typingUsers.length === 0) {
    return <div className="h-5" />;
  }

  const names = typingUsers.map((u) => u.displayName);
  const text =
    names.length === 1
      ? t('typing.one', { name: names[0] })
      : t('typing.many', { names: names.join(', ') });

  return (
    <div className="px-4 h-5 flex items-center">
      <span className="text-xs text-gray-500 italic">{text}</span>
    </div>
  );
}
