'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { getNotebookAdvice, getScheduleFromImage } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Book, Settings, LogOut, Backpack, RefreshCw, X, CalendarOff, Upload, Sparkles } from 'lucide-react';
import { omitBy } from 'lodash';

type AppViewProps = {
  setView: (view: 'app' | 'settings') => void;
  shouldRefresh?: boolean;
};

export default function AppView({ setView, shouldRefresh }: AppViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [isVacation, setIsVacation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleExists, setScheduleExists] = useState(true);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      if (scheduleSnap.exists() && scheduleSnap.data().schedule) {
        setScheduleExists(true);
        const scheduleData = scheduleSnap.data();
        const scheduleString = JSON.stringify(scheduleData.schedule);
        const vacations = scheduleData.vacations || [];
        const result = await getNotebookAdvice(scheduleString, vacations);
        
        if (result.success) {
          setIsVacation(result.isVacation || false);
          if (result.notebooks) {
            setNotebooks(result.notebooks.split(',').map(n => n.trim()).filter(Boolean));
          } else {
            setNotebooks([]);
          }
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
          setNotebooks([]);
        }
      } else {
        setScheduleExists(false);
        setNotebooks([]);
        setIsVacation(false);
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

  const handleRemoveNotebook = (notebookToRemove: string) => {
    setNotebooks(currentNotebooks => currentNotebooks.filter(notebook => notebook !== notebookToRemove));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setProcessingImage(true);
    toast({ title: 'Procesando imagen...', description: 'La IA está analizando tu horario. Esto puede tardar un momento.' });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const photoDataUri = reader.result as string;
        const result = await getScheduleFromImage(photoDataUri);

        if (result.success && result.schedule) {
            try {
              const scheduleRef = doc(db, 'schedules', user.uid);
              const cleanedSchedule = omitBy(result.schedule, (value) => !value);
              await setDoc(scheduleRef, { schedule: cleanedSchedule }, { merge: true });
              toast({ title: '¡Horario guardado!', description: 'Tu horario ha sido guardado y analizado.' });
              fetchAdvice(true);
            } catch (error) {
              toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el horario extraído.' });
            }
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setProcessingImage(false);
    };
    reader.onerror = (error) => {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo leer el archivo de imagen.' });
        setProcessingImage(false);
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
            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-card space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Bienvenido/a</h3>
                  <p className="text-muted-foreground font-medium">Empieza por configurar tu horario.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => fileInputRef.current?.click()} disabled={processingImage} className="w-full sm:w-auto">
                        {processingImage ? (
                            <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Upload className="mr-2 h-4 w-4" />
                        )}
                        Subir Horario con IA
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                    />
                    <Button variant="secondary" onClick={() => setView('settings')} className="w-full sm:w-auto">
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración Manual
                    </Button>
                </div>
            </div>
        );
    }
    
    if (isVacation) {
        return (
            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-card">
                 <CalendarOff className="mx-auto h-10 w-10 text-primary mb-3" />
                <p className="text-muted-foreground font-medium">¡Estás de vacaciones! No necesitas cuadernos.</p>
                <p className="text-muted-foreground text-sm">Disfruta de tu tiempo libre.</p>
            </div>
        );
    }

    if (notebooks.length === 0) {
        return <p className="text-muted-foreground text-center italic py-4">No se necesitan cuadernos para mañana. ¡Disfruta tu día libre!</p>;
    }

    return notebooks.map((notebook, index) => (
      <div key={index} className="flex items-center justify-between gap-3 p-3 bg-secondary rounded-md animate-in fade-in-50">
        <div className="flex items-center gap-3">
          <Book className="h-5 w-5 text-primary" />
          <span className="font-medium">{notebook}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveNotebook(notebook)}>
            <X className="h-4 w-4 text-muted-foreground" />
        </Button>
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
            <Button variant="outline" size="icon" onClick={() => fetchAdvice(true)} disabled={refreshing || loading || !scheduleExists} aria-label="Refrescar recomendaciones">
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
