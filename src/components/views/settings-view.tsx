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
import { ArrowLeft, Save, PlusCircle } from 'lucide-react';
import { isEqual, omitBy } from 'lodash';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Profile } from '@/app/page';
import ProfileManager from './profile-manager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SettingsViewProps = {
  setView: (view: 'app' | 'settings' | 'profiles') => void;
  onSettingsSaved: () => void;
  profiles: Profile[];
};

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const internalDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Schedule = {
  [key: string]: string;
};

const initialSchedule: Schedule = internalDaysOfWeek.reduce((acc, day) => {
  acc[day] = '';
  return acc;
}, {} as Schedule);

export default function SettingsView({ setView, onSettingsSaved, profiles: initialProfiles }: SettingsViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<Schedule>(initialSchedule);
  const [vacations, setVacations] = useState<Date[]>([]);
  
  const [originalSchedule, setOriginalSchedule] = useState<Schedule>(initialSchedule);
  const [originalVacations, setOriginalVacations] = useState<Date[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialProfiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(initialProfiles[0].id);
    } else if (initialProfiles.length === 0) {
      setLoading(false);
    }
  }, [initialProfiles, selectedProfileId]);
  
  const fetchProfileData = useCallback(async () => {
    if (!user || !selectedProfileId) {
      if (!selectedProfileId) {
        setSchedule(initialSchedule);
        setVacations([]);
        setOriginalSchedule(initialSchedule);
        setOriginalVacations([]);
        setLoading(false);
      }
      return;
    };

    setLoading(true);
    try {
      const profileDocRef = doc(db, 'users', user.uid, 'profiles', selectedProfileId);
      const profileDocSnap = await getDoc(profileDocRef);

      if (profileDocSnap.exists()) {
        const data = profileDocSnap.data();
        const existingSchedule = data.schedule || {};
        
        const fullSchedule = internalDaysOfWeek.reduce((acc, day) => {
          acc[day] = existingSchedule[day] || '';
          return acc;
        }, {} as Schedule);
        
        const existingVacations = (data.vacations || []).map((v: string) => {
          const date = new Date(v);
          return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        });
        
        setSchedule(fullSchedule);
        setOriginalSchedule(fullSchedule);
        setVacations(existingVacations);
        setOriginalVacations(existingVacations);
      } else {
        setSchedule(initialSchedule);
        setOriginalSchedule(initialSchedule);
        setVacations([]);
        setOriginalVacations([]);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el horario del perfil.' });
    } finally {
      setLoading(false);
    }
  }, [user, selectedProfileId, toast]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleInputChange = (day: string, value: string) => {
    setSchedule(prev => ({ ...prev, [day]: value }));
  };

  const handleSave = async () => {
    if (!user || !selectedProfileId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay un perfil seleccionado para guardar.' });
        return;
    }
    setSaving(true);
    try {
      const profileDocRef = doc(db, 'users', user.uid, 'profiles', selectedProfileId);
      
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

      await setDoc(profileDocRef, {
        schedule: cleanedSchedule,
        vacations: vacationsToSave
      }, { merge: true });

      toast({ title: '¡Éxito!', description: `El horario para ${profiles.find(p => p.id === selectedProfileId)?.name} ha sido guardado.` });
      setOriginalSchedule(scheduleToSave);
      setOriginalVacations(vacations);
      onSettingsSaved();

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const onProfilesUpdate = (newProfiles: Profile[]) => {
    const isNewProfileAdded = newProfiles.length > profiles.length;
    setProfiles(newProfiles);
    
    if (isNewProfileAdded) {
      setSelectedProfileId(newProfiles[newProfiles.length - 1].id);
    } else if (!newProfiles.some(p => p.id === selectedProfileId)) {
      setSelectedProfileId(newProfiles.length > 0 ? newProfiles[0].id : null);
    }
  }

  const hasChanges = selectedProfileId && (!isEqual(schedule, originalSchedule) || !isEqual(vacations.map(d => d.toISOString().split('T')[0]), originalVacations.map(d => d.toISOString().split('T')[0])));
  
  const renderScheduleSkeleton = () => (
    <div className="space-y-6 pt-6">
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
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in-50">
        <Button variant="outline" onClick={() => setView('app')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
        </Button>
        
        <ProfileManager profiles={profiles} onProfilesUpdate={onProfilesUpdate} />
        
        {profiles.length > 0 ? (
            <Card className="shadow-lg mt-6">
                <CardHeader>
                    <CardTitle>Configura el Horario y Vacaciones</CardTitle>
                    <CardDescription>
                        Selecciona un perfil y luego ingresa sus asignaturas y días de vacaciones.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8">
                        <div>
                            <Label htmlFor='profile-select' className="text-base font-medium">Perfil</Label>
                             <Select value={selectedProfileId || ''} onValueChange={setSelectedProfileId}>
                                <SelectTrigger id="profile-select" className="mt-2">
                                    <SelectValue placeholder="Selecciona un perfil..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {profiles.map(profile => (
                                        <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {loading ? renderScheduleSkeleton() : (
                            <>
                                <div>
                                    <h3 className="text-lg font-medium mb-4">Horario Semanal</h3>
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
                                        Selecciona los días en el calendario en los que no habrá clases.
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
                            </>
                        )}

                        <Button type="submit" disabled={saving || !hasChanges || loading} className="mt-8 bg-accent hover:bg-accent/90">
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        ) : (
            <Card className="shadow-lg mt-6 text-center">
                <CardHeader>
                    <CardTitle>Crea tu Primer Perfil</CardTitle>
                    <CardDescription>
                        Para empezar, añade un perfil para tu primer niño. Haz clic en "Añadir Perfil" arriba.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                </CardContent>
            </Card>
        )}
    </div>
  );
}
