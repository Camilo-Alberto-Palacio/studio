'use client';

import { Profile } from '@/app/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Users, PlusCircle } from 'lucide-react';

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
                            className="w-full justify-start h-14 text-lg"
                            onClick={() => onProfileSelect(profile)}
                        >
                            <User className="mr-4 h-6 w-6" />
                            {profile.name}
                        </Button>
                    ))}
                     <Button
                        variant="secondary"
                        className="w-full justify-start h-14 text-lg"
                        onClick={() => setView('settings')}
                    >
                        <PlusCircle className="mr-4 h-6 w-6" />
                        Añadir un nuevo perfil
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
