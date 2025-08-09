'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db, generateId } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, writeBatch, arrayUnion, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Save, X, User } from 'lucide-react';
import { Profile } from '@/app/page';

type ProfileManagerProps = {
  profiles: Profile[];
  onProfilesUpdate: (profiles: Profile[]) => void;
};

export default function ProfileManager({ profiles, onProfilesUpdate }: ProfileManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddProfile = async () => {
    if (!user || !newProfileName.trim()) return;

    setIsAdding(true);
    const newProfile: Profile = {
      id: generateId(`users/${user.uid}/profiles`),
      name: newProfileName.trim(),
    };

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const profileDocRef = doc(db, 'users', user.uid, 'profiles', newProfile.id);
        const userDocSnap = await getDoc(userDocRef);

        const batch = writeBatch(db);

        // Ensure user document exists before trying to update it
        if (!userDocSnap.exists()) {
          batch.set(userDocRef, { profiles: [] }); // Create user doc with empty profiles array
        }
        
        // Create the profile subdocument
        batch.set(profileDocRef, { name: newProfile.name, schedule: {}, vacations: [] });
        
        // Atomically add the new profile to the 'profiles' array
        batch.update(userDocRef, { 
          profiles: arrayUnion({id: newProfile.id, name: newProfile.name}) 
        });

        await batch.commit();

        toast({ title: 'Perfil añadido', description: `Se ha creado el perfil "${newProfile.name}".` });
        onProfilesUpdate([...profiles, newProfile]);
        setNewProfileName('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudo añadir el perfil: ${error.message}` });
    } finally {
        setIsAdding(false);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditingProfileName(profile.name);
  };

  const handleUpdateProfile = async () => {
    if (!user || !editingProfileId || !editingProfileName.trim()) return;

    try {
        const updatedProfiles = profiles.map(p =>
            p.id === editingProfileId ? { ...p, name: editingProfileName.trim() } : p
        );
        const userDocRef = doc(db, 'users', user.uid);
        const profileDocRef = doc(db, 'users', user.uid, 'profiles', editingProfileId);
        
        const batch = writeBatch(db);
        batch.update(profileDocRef, { name: editingProfileName.trim() });
        batch.update(userDocRef, { profiles: updatedProfiles });
        await batch.commit();
        
        toast({ title: 'Perfil actualizado', description: 'El nombre del perfil ha sido cambiado.' });
        onProfilesUpdate(updatedProfiles);
        setEditingProfileId(null);
        setEditingProfileName('');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar el perfil: ${error.message}` });
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!user || !window.confirm('¿Estás seguro de que quieres eliminar este perfil y todo su horario? Esta acción no se puede deshacer.')) return;

    try {
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        const userDocRef = doc(db, 'users', user.uid);
        const profileDocRef = doc(db, 'users', user.uid, 'profiles', profileId);
        
        const batch = writeBatch(db);
        batch.delete(profileDocRef);
        batch.update(userDocRef, { profiles: updatedProfiles });
        await batch.commit();

        toast({ title: 'Perfil eliminado', description: 'El perfil ha sido eliminado correctamente.' });
        onProfilesUpdate(updatedProfiles);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar el perfil: ${error.message}` });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Perfiles</CardTitle>
        <CardDescription>Añade, edita o elimina perfiles para cada niño.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {profiles.map(profile => (
            <div key={profile.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
              {editingProfileId === profile.id ? (
                <div className="flex-grow flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <Input
                        value={editingProfileName}
                        onChange={e => setEditingProfileName(e.target.value)}
                        className="h-8"
                    />
                </div>
              ) : (
                <span className="font-medium flex items-center gap-2"><User className="h-5 w-5 text-muted-foreground" />{profile.name}</span>
              )}
              <div className="flex items-center gap-1">
                {editingProfileId === profile.id ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={handleUpdateProfile}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingProfileId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProfile(profile)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-red-700" onClick={() => handleDeleteProfile(profile.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-2">Añadir Nuevo Perfil</h4>
          <div className="flex items-center gap-2">
            <Input
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              placeholder="Nombre del niño"
              onKeyDown={(e) => e.key === 'Enter' && handleAddProfile()}
            />
            <Button onClick={handleAddProfile} disabled={isAdding}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isAdding ? 'Añadiendo...' : 'Añadir'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
