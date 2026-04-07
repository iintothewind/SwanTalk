import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  email?: string;
}

export interface Topic {
  id: string;
  name: string;
  owner: string;
  createTime: Timestamp | null;
  access: 'public' | 'private';
  status: 'active' | 'archived';
  visibility: string[];
}

export interface Message {
  id: string;
  sender: string;
  senderName: string;
  senderPhoto: string;
  senderEmail?: string;
  content: string;
  time: Timestamp | null;
  isOptimistic?: boolean;
}

export interface TypingUser {
  uid: string;
  displayName: string;
  timestamp: Timestamp | null;
}

export interface AppState {
  user: User | null;
  topics: Topic[];
  activeTopicId: string | null;
  messages: Message[];
  typingUsers: TypingUser[];
  unreadCounts: Record<string, number>;
  ui: {
    sidebarOpen: boolean;
    loading: boolean;
  };
}
