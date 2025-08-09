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
import { Book, Settings, LogOut, Backpack, RefreshCw, X, CalendarOff, Upload, Sparkles, CalendarDays, Volume2, Loader2, Users } from 'lucide-react';
import { isEmpty, omitBy } from 'lodash';
import { Profile } from '@/app/page';

type AppViewProps = {
  setView: (view: 'app' | 'settings' | 'profiles') => void;
  profile: Profile;
  onProfileChange: () => void;
};

export default function AppView({ setView, profile, onProfileChange }: AppViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [isVacation, setIsVacation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleExists, setScheduleExists] = useState(true);
  const [processingImage, setProcessingImage] = useState(false);
  const [adviceDate, setAdviceDate] = useState(new Date());
  const [adviceTitle, setAdviceTitle] = useState('Cuadernos para Hoy');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isSpeakingRef = useRef(false);
  const [speechSynthesisVoices, setSpeechSynthesisVoices] = useState<SpeechSynthesisVoice[]>([]);
  const hasPlayedAuto = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setSpeechSynthesisVoices(availableVoices);
      }
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); 

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playAudio = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({
          variant: 'destructive',
          title: 'Audio no soportado',
          description: 'Tu navegador no soporta la síntesis de voz.',
      });
      return;
    }

    if (isSpeakingRef.current) {
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
        return;
    }

    if (notebooks.length === 0 || speechSynthesisVoices.length === 0) return;

    const textToSay = `Para ${profile.name}, ${adviceTitle.toLowerCase()}, necesitas los siguientes cuadernos: ${notebooks.join(', ')}.`;
    const utterance = new SpeechSynthesisUtterance(textToSay);
    
    const spanishVoice = speechSynthesisVoices.find(voice => voice.lang.startsWith('es'));
    if (spanishVoice) {
        utterance.voice = spanishVoice;
    } else {
        console.warn("No Spanish voice found, using default.");
    }
    
    utterance.onstart = () => { isSpeakingRef.current = true };
    utterance.onend = () => { isSpeakingRef.current = false };
    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error', event);
        toast({
            variant: 'destructive',
            title: 'Error de audio',
            description: 'No se pudo generar la narración. Inténtalo de nuevo.',
        });
        isSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  }, [notebooks, profile.name, adviceTitle, toast, speechSynthesisVoices]);


  const fetchAdvice = useCallback(async (isRefresh = false) => {
    if (!user || !profile) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    hasPlayedAuto.current = false;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }

    try {
      const profileDocRef = doc(db, 'users', user.uid, 'profiles', profile.id);
      const profileDocSnap = await getDoc(profileDocRef);

      const determineAdviceDate = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();
    
        let targetDate = new Date(now);
        let title = 'Cuadernos para Hoy';
    
        if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
          if (hour >= 15) {
            targetDate.setDate(now.getDate() + 1);
            title = 'Cuadernos para Mañana';
          }
        } else if (dayOfWeek === 5) { // Friday
          if (hour >= 15) {
            targetDate.setDate(now.getDate() + 3);
            title = 'Cuadernos para el Lunes';
          }
        } else if (dayOfWeek === 6) { // Saturday
          targetDate.setDate(now.getDate() + 2);
          title = 'Cuadernos para el Lunes';
        } else if (dayOfWeek === 0) { // Sunday
          targetDate.setDate(now.getDate() + 1);
          title = 'Cuadernos para el Lunes';
        }
        
        return { targetDate, title };
      };

      const { targetDate, title } = determineAdviceDate();
      setAdviceDate(targetDate);
      setAdviceTitle(title);
      const dateString = targetDate.toISOString().split('T')[0];
      
      if (profileDocSnap.exists()) {
        const profileData = profileDocSnap.data();
        const schedule = profileData.schedule || {};
        const cleanedSchedule = omitBy(schedule, (value) => !value);

        if (!isEmpty(cleanedSchedule)) {
            setScheduleExists(true);
            const scheduleString = JSON.stringify(schedule);
            const vacations = profileData.vacations || [];
            const result = await getNotebookAdvice(scheduleString, dateString, vacations, profile.name);
            
            if (result.success) {
                setIsVacation(result.isVacation || false);
                const newNotebooks = result.notebooks ? result.notebooks.split(',').map(n => n.trim()).filter(Boolean) : [];
                setNotebooks(newNotebooks);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
                setNotebooks([]);
            }
        } else {
            setScheduleExists(false);
            setNotebooks([]);
            setIsVacation(false);
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
  }, [user, profile, toast]);
  
  useEffect(() => {
    fetchAdvice(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);
  
  useEffect(() => {
    if (!loading && !isVacation && notebooks.length > 0 && !hasPlayedAuto.current && speechSynthesisVoices.length > 0) {
        playAudio();
        hasPlayedAuto.current = true;
    }
  }, [loading, notebooks, isVacation, playAudio, speechSynthesisVoices]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión exitosamente.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al Cerrar Sesión', description: error.message });
    }
  };

  const handleRemoveNotebook = (notebookToRemove: string) => {
    setNotebooks(currentNotebooks => {
      return currentNotebooks.filter(notebook => notebook !== notebookToRemove);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !profile) return;

    setProcessingImage(true);
    toast({ title: 'Procesando imagen...', description: 'La IA está analizando tu horario. Esto puede tardar un momento.' });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const photoDataUri = reader.result as string;
        const result = await getScheduleFromImage(photoDataUri);

        if (result.success && result.schedule) {
            try {
              const profileDocRef = doc(db, 'users', user.uid, 'profiles', profile.id);
              const cleanedSchedule = omitBy(result.schedule, (value) => !value);
              await setDoc(profileDocRef, { schedule: cleanedSchedule }, { merge: true });
              toast({ title: '¡Horario guardado!', description: `El horario para ${profile.name} ha sido guardado.` });
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
                  <h3 className="text-lg font-semibold">¡Hola! Para empezar con {profile.name}...</h3>
                  <p className="text-muted-foreground font-medium">Necesito conocer su horario.</p>
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
                <p className="text-muted-foreground font-medium">¡{profile.name} está de vacaciones! No necesita cuadernos.</p>
                <p className="text-muted-foreground text-sm">A disfrutar del tiempo libre.</p>
            </div>
        );
    }

    if (notebooks.length === 0) {
      const dayOfWeek = adviceDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return <p className="text-muted-foreground text-center italic py-4">No hay clases programadas. ¡Disfruta tu fin de semana!</p>;
      }
      return <p className="text-muted-foreground text-center italic py-4">No se necesitan cuadernos. ¡Disfruta tu día libre!</p>;
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
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Mochila de {profile.name}</h1>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onProfileChange} aria-label="Cambiar Perfil">
                <Users className="h-5 w-5" />
            </Button>
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
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                {adviceTitle}
              </CardTitle>
              <CardDescription>Esto es lo que {profile.name} necesita empacar.</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={playAudio} disabled={notebooks.length === 0 || loading || speechSynthesisVoices.length === 0} aria-label="Leer en voz alta">
                {isSpeakingRef.current ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => fetchAdvice(true)} disabled={refreshing || loading || !scheduleExists} aria-label="Refrescar recomendaciones">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
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
