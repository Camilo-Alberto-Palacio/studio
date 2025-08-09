'use client';

import { Profile } from '@/app/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


type ProfileSelectorViewProps = {
  profiles: Profile[];
  onProfileSelect: (profile: Profile) => void;
  setView: (view: 'settings') => void;
};

export default function ProfileSelectorView({ profiles, onProfileSelect, setView }: ProfileSelectorViewProps) {
  
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
                        <Button
                            key={profile.id}
                            variant="outline"
                            className="w-full justify-start h-16 text-lg gap-4"
                            onClick={() => onProfileSelect(profile)}
                        >
                            <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${profile.name}`} alt={profile.name} />
                                <AvatarFallback>{profile.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <span>{profile.name}</span>
                        </Button>
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
