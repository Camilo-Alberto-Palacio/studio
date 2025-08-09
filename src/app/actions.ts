'use server';

import { adviseDailyNotebooks } from '@/ai/flows/daily-notebook-advisor';
import { organizeScheduleFromImage } from '@/ai/flows/organize-schedule-flow';

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
