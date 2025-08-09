'use server';

/**
 * @fileOverview A daily notebook advisor AI agent.
 *
 * - adviseDailyNotebooks - A function that handles the daily notebook advising process.
 * - AdviseDailyNotebooksInput - The input type for the adviseDailyNotebooks function.
 * - AdviseDailyNotebooksOutput - The return type for the adviseDailyNotebooks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdviseDailyNotebooksInputSchema = z.object({
  schedule: z.string().describe('The user schedule as a JSON string.'),
  date: z.string().describe('The date to check the schedule for, in YYYY-MM-DD format.'),
  vacations: z.array(z.string()).describe('An array of vacation dates in YYYY-MM-DD format.'),
  profileName: z.string().describe('The name of the child (profile) this schedule is for.'),
});
export type AdviseDailyNotebooksInput = z.infer<typeof AdviseDailyNotebooksInputSchema>;

const AdviseDailyNotebooksOutputSchema = z.object({
  notebooks: z
    .string()
    .describe('A comma separated list of notebooks required for the specified date based on the schedule.'),
  isVacation: z.boolean().describe('Whether the given date is a vacation day.'),
});
export type AdviseDailyNotebooksOutput = z.infer<typeof AdviseDailyNotebooksOutputSchema>;

export async function adviseDailyNotebooks(input: AdviseDailyNotebooksInput): Promise<AdviseDailyNotebooksOutput> {
  return adviseDailyNotebooksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adviseDailyNotebooksPrompt',
  input: {schema: AdviseDailyNotebooksInputSchema},
  output: {schema: AdviseDailyNotebooksOutputSchema},
  prompt: `Eres un asistente personal que ayuda a los estudiantes a empacar sus mochilas.

Se te proporcionará el horario del estudiante, la fecha a consultar, una lista de días de vacaciones y el nombre del niño (perfil).

Tu tarea es determinar qué cuadernos se requieren para las clases de ese día para el perfil especificado.

Primero, comprueba si la fecha a consultar está en la lista de vacaciones.
- Si la fecha está en la lista de vacaciones, establece 'isVacation' en true y devuelve una lista vacía de cuadernos.
- Si no es un día de vacaciones, establece 'isVacation' en false y determina los cuadernos necesarios basándote en el horario semanal.

Perfil: {{{profileName}}}
Fecha: {{{date}}}
Horario: {{{schedule}}}
Vacaciones: {{{vacations}}}

Devuelve una lista separada por comas de los cuadernos que se requieren. Si no hay clases ese día y no son vacaciones, devuelve una cadena vacía.
`,
});

const adviseDailyNotebooksFlow = ai.defineFlow(
  {
    name: 'adviseDailyNotebooksFlow',
    inputSchema: AdviseDailyNotebooksInputSchema,
    outputSchema: AdviseDailyNotebooksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
