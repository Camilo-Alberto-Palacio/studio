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
  prompt: `You are a personal assistant helping students pack their backpacks.

You will be provided with the student's schedule and the date to check. Your task is to determine which notebooks are required for the classes on that day.

Date: {{{date}}}
Schedule: {{{schedule}}}

Return a comma separated list of the notebooks that are required. If there are no classes on that day, return an empty string.
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
