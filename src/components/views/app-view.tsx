'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { getNotebookAdvice } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Book, Settings, LogOut, Backpack, RefreshCw } from 'lucide-react';

type AppViewProps = {
  setView: (view: 'app' | 'settings') => void;
};

export default function AppView({ setView }: AppViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scheduleExists, setScheduleExists] = useState(false);

  const fetchAdvice = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const scheduleRef = doc(db, 'schedules', user.uid);
      const scheduleSnap = await getDoc(scheduleRef);

      if (scheduleSnap.exists()) {
        setScheduleExists(true);
        const scheduleData = scheduleSnap.data();
        const scheduleString = JSON.stringify(scheduleData);
        const result = await getNotebookAdvice(scheduleString);
        
        if (result.success) {
          setNotebooks(result.notebooks ?? '');
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
          setNotebooks('');
        }
      } else {
        setScheduleExists(false);
        setNotebooks('');
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch your schedule and advice.' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAdvice();
  }, [fetchAdvice]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Logout Error', description: error.message });
    }
  };

  const renderNotebooks = () => {
    if (loading) {
      return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 p-3"><Skeleton className="h-5 w-5 rounded-full" /><Skeleton className="h-5 w-3/4" /></div>
            <div className="flex items-center gap-3 p-3"><Skeleton className="h-5 w-5 rounded-full" /><Skeleton className="h-5 w-1/2" /></div>
        </div>
      );
    }

    if (!scheduleExists) {
        return (
            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-secondary">
                <p className="text-muted-foreground mb-4">You haven't set up your schedule yet.</p>
                <Button onClick={() => setView('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Set Up Schedule
                </Button>
            </div>
        );
    }

    if (!notebooks) {
        return <p className="text-muted-foreground text-center italic py-4">No notebooks needed for tomorrow. Enjoy your day off!</p>;
    }

    return notebooks.split(',').map((notebook, index) => (
      <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-md">
        <Book className="h-5 w-5 text-primary" />
        <span className="font-medium">{notebook.trim()}</span>
      </div>
    ));
  };


  return (
    <div className="max-w-2xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <Backpack className="h-8 w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">My Smart Backpack</h1>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setView('settings')} aria-label="Settings">
                <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
                <LogOut className="h-5 w-5" />
            </Button>
        </div>
      </header>

      <Card className="shadow-lg animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Notebooks for Tomorrow</CardTitle>
              <CardDescription>Here's what you need to pack for your classes.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fetchAdvice} disabled={loading} aria-label="Refresh advice">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
             {renderNotebooks()}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
