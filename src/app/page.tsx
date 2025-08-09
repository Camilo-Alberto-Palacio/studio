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
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';


export type Profile = {
  id: string;
  name: string;
};

function AppContent() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
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
      }
      setCurrentView('profiles'); // Always start at profile selector
      setProfilesLoading(false);
    }
    fetchProfiles();
  }, [user]);

  const handleSetView = (view: 'app' | 'settings' | 'profiles') => {
    setCurrentView(view);
  }

  const handleProfileSelected = async (profile: Profile) => {
    setSelectedProfile(profile);
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { lastSelectedProfileId: profile.id });
      } catch (e) {
        // User doc might not exist yet, it will be created if they save settings.
        console.log("Could not update lastSelectedProfileId, user doc may not exist yet.");
      }
    }
    setCurrentView('app');
  };
  
  const handleSettingsSaved = async () => {
    // Refetch profiles after saving settings
    if (!user) return;
    setProfilesLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
     if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userProfiles = userData.profiles || [];
        setProfiles(userProfiles);
        // If a profile was being edited, we might need to update it
        if (selectedProfile) {
          const updatedSelected = userProfiles.find((p: Profile) => p.id === selectedProfile.id);
          setSelectedProfile(updatedSelected || null);
        }
     }
    setCurrentView('profiles'); // Go back to profile selection after saving settings.
    setProfilesLoading(false);
  }

  const handleGoToProfiles = () => {
    setSelectedProfile(null);
    setCurrentView('profiles');
  }

  const handleDeleteProfile = async (profileId: string) => {
    if (!user) return;
    try {
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        const userDocRef = doc(db, 'users', user.uid);
        const profileDocRef = doc(db, 'users', user.uid, 'profiles', profileId);
        
        const batch = writeBatch(db);
        batch.delete(profileDocRef);
        batch.update(userDocRef, { profiles: updatedProfiles });
        await batch.commit();

        toast({ title: 'Perfil eliminado', description: 'El perfil ha sido eliminado correctamente.' });
        setProfiles(updatedProfiles);
        // If the deleted profile was the selected one, clear it
        if (selectedProfile?.id === profileId) {
            setSelectedProfile(null);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar el perfil: ${error.message}` });
    }
  };

  const handleProfileAdded = (newProfile: Profile) => {
    setProfiles(prev => [...prev, newProfile]);
    setSelectedProfile(newProfile);
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
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
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
            <AppView setView={handleSetView} profile={selectedProfile} onProfileChange={handleGoToProfiles} />
          ) : currentView === 'settings' ? (
            <SettingsView setView={handleSetView} onSettingsSaved={handleSettingsSaved} profiles={profiles} onProfileAdded={handleProfileAdded} />
          ) : (
            <ProfileSelectorView profiles={profiles} onProfileSelect={handleProfileSelected} setView={handleSetView} onDeleteProfile={handleDeleteProfile} />
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
