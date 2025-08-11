'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';

type CameraViewProps = {
  onPictureTaken: (dataUri: string) => void;
  onBack: () => void;
};

export default function CameraView({ onPictureTaken, onBack }: CameraViewProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Cámara no Soportada',
          description: 'Tu navegador no soporta el acceso a la cámara.',
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Acceso a la Cámara Denegado',
          description: 'Por favor, activa los permisos de la cámara en la configuración de tu navegador.',
        });
      }
    };

    getCameraPermission();

    return () => {
      // Cleanup: stop the camera stream when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
    const dataUri = canvas.toDataURL('image/jpeg');
    onPictureTaken(dataUri);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Button variant="outline" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Capturar Horario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden flex items-center justify-center">
            {hasCameraPermission === null && <Loader2 className="h-8 w-8 animate-spin" />}
            
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline // Important for iOS
              style={{ display: hasCameraPermission ? 'block' : 'none' }}
            />
            
            {hasCameraPermission === false && (
              <div className="p-4">
                <Alert variant="destructive">
                  <Camera className="h-4 w-4" />
                  <AlertTitle>Acceso a la Cámara Necesario</AlertTitle>
                  <AlertDescription>
                    No se pudo acceder a la cámara. Por favor, verifica los permisos en tu navegador y recarga la página.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={handleCapture}
            disabled={!hasCameraPermission || isCapturing}
            size="lg"
            className="rounded-full h-16 w-16 p-0"
          >
            {isCapturing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8" />}
            <span className="sr-only">Capturar Foto</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
