'use client';

import { useState } from 'react';
import { Profile } from '@/app/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlusCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ProfileSelectorViewProps = {
  profiles: Profile[];
  onProfileSelect: (profile: Profile) => void;
  setView: (view: 'settings') => void;
  onDeleteProfile: (profileId: string) => void;
};

export default function ProfileSelectorView({ profiles, onProfileSelect, setView, onDeleteProfile }: ProfileSelectorViewProps) {
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <Users className="mx-auto h-12 w-12 text-primary mb-4" />
                <CardTitle>¿Para quién es la mochila de hoy?</CardTitle>
                <CardDescription>
                    Selecciona un perfil para ver sus útiles o añade uno nuevo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                    {profiles.map((profile) => (
                        <div key={profile.id} className="flex items-center gap-2">
                          <Button
                              variant="outline"
                              className="w-full justify-start h-16 text-lg gap-4 flex-grow"
                              onClick={() => onProfileSelect(profile)}
                          >
                              <Avatar>
                                  <AvatarImage src={`https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${profile.name}`} alt={profile.name} />
                                  <AvatarFallback>{profile.name.substring(0,2)}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{profile.name}</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-16 w-12 flex-shrink-0 text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente el perfil de <strong>{profile.name}</strong> y todos sus datos asociados, como su horario y vacaciones.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteProfile(profile.id)} className="bg-destructive hover:bg-destructive/90">
                                  Sí, eliminar perfil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                    ))}
                     <Button
                        variant="secondary"
                        className="w-full justify-start h-16 text-lg gap-4"
                        onClick={() => setView('settings')}
                    >
                        <div className='w-10 h-10 flex items-center justify-center'>
                           <PlusCircle className="h-8 w-8" />
                        </div>
                        <span>Añadir un nuevo perfil</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
