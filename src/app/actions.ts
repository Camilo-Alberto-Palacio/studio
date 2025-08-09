'use server';

import { adviseDailyNotebooks } from '@/ai/flows/daily-notebook-advisor';
import { organizeScheduleFromImage } from '@/ai/flows/organize-schedule-flow';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';

export async function getNotebookAdvice(schedule: string, date: string, vacations: string[] = [], profileName: string) {
  try {
    const result = await adviseDailyNotebooks({
      schedule,
      date,
      vacations,
      profileName,
    });
    
    return { success: true, notebooks: result.notebooks, isVacation: result.isVacation };
  } catch (error) {
    console.error('Error getting notebook advice:', error);
    return { success: false, error: 'No se pudo obtener la recomendación de cuadernos de la IA.' };
  }
}

export async function getScheduleFromImage(photoDataUri: string) {
    try {
        const result = await organizeScheduleFromImage({ photoDataUri });
        return { success: true, schedule: result };
    } catch (error) {
        console.error('Error getting schedule from image:', error);
        return { success: false, error: 'No se pudo procesar la imagen del horario.' };
    }
}

export async function getAudioForText(text: string) {
    try {
        const result = await textToSpeech(text);
        return { success: true, audio: result.media };
    } catch (error: any) {
        console.error('Error generating audio:', error);
        // Pass the specific error message from the flow to the client
        return { success: false, error: error.message || 'No se pudo generar el audio.' };
    }
}
