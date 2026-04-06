import { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { SignInScreen } from './components/SignInScreen';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { TopicBar } from './components/TopicBar';
import { ChatPanel } from './components/ChatPanel';
import { useTopics } from './hooks/useTopics';
import { runCacheEviction } from './lib/cacheEviction';

function ChatLayout() {
  useTopics();

  useEffect(() => {
    runCacheEviction().catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      <TopBar />
      <TopicBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <ChatPanel />
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}

export default function App() {
  return <AuthGate />;
}
