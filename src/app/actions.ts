'use server';

import { adviseDailyNotebooks } from '@/ai/flows/daily-notebook-advisor';

export async function getNotebookAdvice(schedule: string, vacations: string[] = []) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const result = await adviseDailyNotebooks({
      schedule,
      date,
      vacations,
    });
    
    return { success: true, notebooks: result.notebooks, isVacation: result.isVacation };
  } catch (error) {
    console.error('Error getting notebook advice:', error);
    return { success: false, error: 'No se pudo obtener la recomendación de cuadernos de la IA.' };
  }
}
