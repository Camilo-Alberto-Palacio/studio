'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

type SettingsViewProps = {
  setView: (view: 'app' | 'settings') => void;
};

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const internalDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

type Schedule = {
    [key: string]: string;
};

export default function SettingsView({ setView }: SettingsViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<Schedule>({
    Monday: '',
    Tuesday: '',
    Wednesday: '',
    Thursday: '',
    Friday: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const scheduleRef = doc(db, 'schedules', user.uid);
      const scheduleSnap = await getDoc(scheduleRef);
      if (scheduleSnap.exists()) {
        const existingSchedule = scheduleSnap.data() as Schedule;
        const fullSchedule = internalDaysOfWeek.reduce((acc, day) => {
            acc[day] = existingSchedule[day] || '';
            return acc;
        }, {} as Schedule)
        setSchedule(fullSchedule);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar tu horario.' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleInputChange = (day: string, value: string) => {
    setSchedule(prev => ({ ...prev, [day]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const scheduleRef = doc(db, 'schedules', user.uid);
      
      const scheduleToSave = Object.entries(schedule).reduce((acc, [day, subjects]) => {
          if(subjects.trim() !== '') {
              acc[day] = subjects;
          }
          return acc;
      }, {} as Schedule);

      await setDoc(scheduleRef, scheduleToSave);
      toast({ title: '¡Éxito!', description: 'Tu horario ha sido guardado.' });
      setView('app');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar el horario: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
      return (
        <div className="max-w-2xl mx-auto">
            <Skeleton className="h-10 w-40 mb-6" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-48 mb-2" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {daysOfWeek.map(day => (
                        <div key={day} className="space-y-2">
                           <Skeleton className="h-6 w-24" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                    <Skeleton className="h-10 w-36 mt-8" />
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in-50">
        <Button variant="outline" onClick={() => setView('app')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
        </Button>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Configura tu Horario</CardTitle>
                <CardDescription>
                    Ingresa tus asignaturas o libros necesarios para cada día. Por ejemplo: "Matemáticas, Cuaderno de Historia, Libro de Biología".
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    {daysOfWeek.map((day, index) => (
                        <div key={internalDaysOfWeek[index]} className="space-y-2">
                            <Label htmlFor={day} className="text-base font-medium">{day}</Label>
                            <Input
                                id={day}
                                value={schedule[internalDaysOfWeek[index]] || ''}
                                onChange={(e) => handleInputChange(internalDaysOfWeek[index], e.target.value)}
                                placeholder="Ej: Matemáticas, Historia, Biología"
                            />
                        </div>
                    ))}
                    <Button type="submit" disabled={saving} className="mt-8 bg-accent hover:bg-accent/90">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Guardando...' : 'Guardar Horario'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
