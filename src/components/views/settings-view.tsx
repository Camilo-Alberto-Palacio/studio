'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, CalendarIcon, Sparkles, Upload } from 'lucide-react';
import { isEqual, omitBy } from 'lodash';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getScheduleFromImage } from '@/app/actions';

type SettingsViewProps = {
  setView: (view: 'app' | 'settings') => void;
};

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const internalDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Schedule = {
    [key: string]: string;
};

type ScheduleDocument = {
    schedule: Schedule;
    vacations: string[];
}

const initialSchedule: Schedule = internalDaysOfWeek.reduce((acc, day) => {
    acc[day] = '';
    return acc;
}, {} as Schedule);


export default function SettingsView({ setView }: SettingsViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<Schedule>(initialSchedule);
  const [vacations, setVacations] = useState<Date[]>([]);
  
  const [originalSchedule, setOriginalSchedule] = useState<Schedule>(initialSchedule);
  const [originalVacations, setOriginalVacations] = useState<Date[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSchedule = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const scheduleRef = doc(db, 'schedules', user.uid);
      const scheduleSnap = await getDoc(scheduleRef);
      if (scheduleSnap.exists()) {
        const data = scheduleSnap.data();
        const existingSchedule = data.schedule || {};
        const existingVacations = (data.vacations || []).map((v: string) => new Date(v));
        
        const fullSchedule = internalDaysOfWeek.reduce((acc, day) => {
            acc[day] = existingSchedule[day] || '';
            return acc;
        }, {} as Schedule);
        
        setSchedule(fullSchedule);
        setOriginalSchedule(fullSchedule);

        setVacations(existingVacations);
        setOriginalVacations(existingVacations);
      } else {
        setOriginalSchedule(initialSchedule);
        setOriginalVacations([]);
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);
    toast({ title: 'Procesando imagen...', description: 'La IA está analizando tu horario. Esto puede tardar un momento.' });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const photoDataUri = reader.result as string;
        const result = await getScheduleFromImage(photoDataUri);

        if (result.success && result.schedule) {
            setSchedule(prev => ({
                ...prev,
                ...result.schedule
            }));
            toast({ title: '¡Horario extraído!', description: 'El horario ha sido rellenado. Por favor, revísalo y guárdalo.' });
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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const scheduleRef = doc(db, 'schedules', user.uid);
      
      const scheduleToSave = Object.entries(schedule).reduce((acc, [day, subjects]) => {
          if(subjects && subjects.trim()) {
              acc[day] = subjects.split(',').map(s => s.trim()).filter(Boolean).join(', ');
          } else {
              acc[day] = '';
          }
          return acc;
      }, {} as Schedule);

      const cleanedSchedule = omitBy(scheduleToSave, (value) => !value);
      const vacationsToSave = vacations.map(d => format(d, 'yyyy-MM-dd'));

      await setDoc(scheduleRef, {
        schedule: cleanedSchedule,
        vacations: vacationsToSave
      });
      toast({ title: '¡Éxito!', description: 'Tu horario y vacaciones han sido guardados.' });
      setView('app');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = !isEqual(schedule, originalSchedule) || !isEqual(vacations.map(d => d.toISOString()), originalVacations.map(d => d.toISOString()));

  if (loading) {
      return (
        <div className="max-w-2xl mx-auto">
            <Button variant="outline" disabled className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
            </Button>
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-48 mb-2" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {daysOfWeek.slice(0, 5).map(day => (
                        <div key={day} className="space-y-2">
                           <Skeleton className="h-6 w-24" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                    <div className="pt-4">
                        <Skeleton className="h-7 w-40 mb-2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-64 w-full mt-2" />
                    </div>
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
                <CardTitle>Configura tu Horario y Vacaciones</CardTitle>
                <CardDescription>
                    Ingresa tus asignaturas para cada día y selecciona tus días de vacaciones.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Horario Semanal</h3>
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={processingImage}>
                                {processingImage ? (
                                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                Subir Horario
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <div className="space-y-6">
                            {daysOfWeek.slice(0, 5).map((day, index) => (
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
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-2">Vacaciones</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Selecciona los días en el calendario en los que no tendrás clases.
                        </p>
                        <div className="flex justify-center rounded-md border">
                            <Calendar
                                mode="multiple"
                                min={1}
                                selected={vacations}
                                onSelect={(dates) => setVacations(dates || [])}
                                locale={es}
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={saving || !hasChanges || processingImage} className="mt-8 bg-accent hover:bg-accent/90">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
