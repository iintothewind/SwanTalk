import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { AppState, Topic, Message, TypingUser } from '../types';

type ChatAction =
  | { type: 'SET_TOPICS'; topics: Topic[] }
  | { type: 'SET_ACTIVE_TOPIC'; topicId: string | null }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'APPEND_MESSAGE'; message: Message }
  | { type: 'PREPEND_MESSAGES'; messages: Message[] }
  | { type: 'REPLACE_OPTIMISTIC'; tempId: string; message: Message }
  | { type: 'SET_TYPING_USERS'; users: TypingUser[] }
  | { type: 'INCREMENT_UNREAD'; topicId: string }
  | { type: 'CLEAR_UNREAD'; topicId: string }
  | { type: 'SET_SIDEBAR_OPEN'; open: boolean }
  | { type: 'SET_LOADING'; loading: boolean };

const initialState: AppState = {
  user: null,
  topics: [],
  activeTopicId: null,
  messages: [],
  typingUsers: [],
  unreadCounts: {},
  ui: {
    sidebarOpen: false,
    loading: false,
  },
};

function chatReducer(state: AppState, action: ChatAction): AppState {
  switch (action.type) {
    case 'SET_TOPICS':
      return { ...state, topics: action.topics };

    case 'SET_ACTIVE_TOPIC':
      return {
        ...state,
        activeTopicId: action.topicId,
        messages: [],
        typingUsers: [],
      };

    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };

    case 'APPEND_MESSAGE': {
      // Avoid duplicates
      const exists = state.messages.some((m) => m.id === action.message.id);
      if (exists) return state;
      return { ...state, messages: [...state.messages, action.message] };
    }

    case 'PREPEND_MESSAGES':
      return { ...state, messages: [...action.messages, ...state.messages] };

    case 'REPLACE_OPTIMISTIC': {
      // Filter out any real copy already appended by onSnapshot before replacing
      // the optimistic placeholder, preventing duplicates from the race condition.
      const messages = state.messages
        .filter((m) => m.id !== action.message.id)
        .map((m) => m.id === action.tempId ? action.message : m);
      return { ...state, messages };
    }

    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.users };

    case 'INCREMENT_UNREAD': {
      const prev = state.unreadCounts[action.topicId] ?? 0;
      return {
        ...state,
        unreadCounts: { ...state.unreadCounts, [action.topicId]: prev + 1 },
      };
    }

    case 'CLEAR_UNREAD':
      return {
        ...state,
        unreadCounts: { ...state.unreadCounts, [action.topicId]: 0 },
      };

    case 'SET_SIDEBAR_OPEN':
      return { ...state, ui: { ...state.ui, sidebarOpen: action.open } };

    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, loading: action.loading } };

    default:
      return state;
  }
}

interface ChatContextValue {
  state: AppState;
  dispatch: Dispatch<ChatAction>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
