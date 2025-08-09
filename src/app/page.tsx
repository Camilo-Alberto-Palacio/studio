'use client';

import { useState } from 'react';
import AuthProvider from '@/components/auth-provider';
import { useAuth } from '@/hooks/use-auth';
import LoginView from '@/components/views/login-view';
import AppView from '@/components/views/app-view';
import SettingsView from '@/components/views/settings-view';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'app' | 'settings'>('app');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen font-body text-foreground">
      {!user ? (
        <LoginView />
      ) : (
        <div className="p-4 sm:p-6 md:p-8">
          {currentView === 'app' ? (
            <AppView setView={setCurrentView} />
          ) : (
            <SettingsView setView={setCurrentView} />
          )}
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
