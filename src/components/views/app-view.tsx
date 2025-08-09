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
  shouldRefresh?: boolean;
};

export default function AppView({ setView, shouldRefresh }: AppViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleExists, setScheduleExists] = useState(true);

  const fetchAdvice = useCallback(async (isRefresh = false) => {
    if (!user) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo obtener tu horario y recomendaciones.' });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAdvice(false);
  }, [fetchAdvice, shouldRefresh]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión exitosamente.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al Cerrar Sesión', description: error.message });
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
            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-card">
                <p className="text-muted-foreground mb-4 font-medium">Parece que aún no has configurado tu horario semanal.</p>
                <Button onClick={() => setView('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Ir a Configuración
                </Button>
            </div>
        );
    }

    if (!notebooks) {
        return <p className="text-muted-foreground text-center italic py-4">No se necesitan cuadernos para mañana. ¡Disfruta tu día libre!</p>;
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
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Mi Mochila Inteligente</h1>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setView('settings')} aria-label="Configuración">
                <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Cerrar sesión">
                <LogOut className="h-5 w-5" />
            </Button>
        </div>
      </header>

      <Card className="shadow-lg animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Cuadernos para Mañana</CardTitle>
              <CardDescription>Esto es lo que necesitas empacar para tus clases.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchAdvice(true)} disabled={refreshing || loading} aria-label="Refrescar recomendaciones">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
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
