'use client';

import { useState, useEffect } from 'react';
import AuthProvider from '@/components/auth-provider';
import { useAuth } from '@/hooks/use-auth';
import LoginView from '@/components/views/login-view';
import AppView from '@/components/views/app-view';
import SettingsView from '@/components/views/settings-view';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ProfileSelectorView from '@/components/views/profile-selector-view';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export type Profile = {
  id: string;
  name: string;
};

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'app' | 'settings' | 'profiles'>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      if (!user) {
        setProfilesLoading(false);
        return;
      };
      setProfilesLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userProfiles = userData.profiles || [];
        setProfiles(userProfiles);
        
        if (userProfiles.length === 1) {
          setSelectedProfile(userProfiles[0]);
          setCurrentView('app');
        } else if (userProfiles.length > 1) {
          const lastProfileId = userData.lastSelectedProfileId;
          const lastProfile = userProfiles.find((p: Profile) => p.id === lastProfileId);
          if(lastProfile) {
            setSelectedProfile(lastProfile);
            setCurrentView('app');
          } else {
            setCurrentView('profiles');
          }
        } else {
          setCurrentView('settings'); // No profiles, go to settings to create one
        }
      } else {
        // No user doc, probably a new user
        setCurrentView('settings');
      }
      setProfilesLoading(false);
    }
    fetchProfiles();
  }, [user]);

  const handleSetView = (view: 'app' | 'settings' | 'profiles') => {
    setCurrentView(view);
  }

  const handleProfileSelected = (profile: Profile) => {
    setSelectedProfile(profile);
    setCurrentView('app');
  };
  
  const handleSettingsSaved = async () => {
    // Refetch profiles after saving settings
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
     if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userProfiles = userData.profiles || [];
        setProfiles(userProfiles);
        if (userProfiles.length > 0 && !selectedProfile) {
          setSelectedProfile(userProfiles[0]);
        }
     }
    setCurrentView('app');
  }

  const LoadingSkeleton = () => (
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

  if (loading || profilesLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="min-h-screen font-body text-foreground">
      {!user ? (
        <LoginView />
      ) : (
        <div className="p-4 sm:p-6 md:p-8">
          {currentView === 'app' && selectedProfile ? (
            <AppView setView={handleSetView} profile={selectedProfile} />
          ) : currentView === 'settings' ? (
            <SettingsView setView={handleSetView} onSettingsSaved={handleSettingsSaved} profiles={profiles} />
          ) : (
            <ProfileSelectorView profiles={profiles} onProfileSelect={handleProfileSelected} setView={handleSetView} />
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
