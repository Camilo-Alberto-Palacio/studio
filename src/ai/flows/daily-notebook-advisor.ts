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
  date: z.string().describe('The date to check the schedule for, in ISO format.'),
});
export type AdviseDailyNotebooksInput = z.infer<typeof AdviseDailyNotebooksInputSchema>;

const AdviseDailyNotebooksOutputSchema = z.object({
  notebooks: z
    .string()
    .describe('A comma separated list of notebooks required for tomorrow based on the schedule.'),
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

Se te proporcionará el horario del estudiante y la fecha a consultar. Tu tarea es determinar qué cuadernos se requieren para las clases de ese día.

Fecha: {{{date}}}
Horario: {{{schedule}}}

Devuelve una lista separada por comas de los cuadernos que se requieren. Si no hay clases ese día, devuelve una cadena vacía.
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
