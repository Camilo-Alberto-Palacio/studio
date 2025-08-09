'use server';

import { adviseDailyNotebooks } from '@/ai/flows/daily-notebook-advisor';

export async function getNotebookAdvice(schedule: string) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const result = await adviseDailyNotebooks({
      schedule,
      date,
    });
    
    return { success: true, notebooks: result.notebooks };
  } catch (error) {
    console.error('Error getting notebook advice:', error);
    return { success: false, error: 'Failed to get notebook advice from AI.' };
  }
}
