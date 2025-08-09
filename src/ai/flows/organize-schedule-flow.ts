'use server';

/**
 * @fileOverview An AI agent for organizing a weekly schedule from an image.
 *
 * - organizeScheduleFromImage - A function that handles parsing a schedule from an image.
 * - OrganizeScheduleInput - The input type for the organizeScheduleFromImage function.
 * - OrganizeScheduleOutput - The return type for the organizeScheduleFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OrganizeScheduleInputSchema = z.object({
    photoDataUri: z
    .string()
    .describe(
      "A photo of a weekly schedule, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type OrganizeScheduleInput = z.infer<typeof OrganizeScheduleInputSchema>;

const OrganizeScheduleOutputSchema = z.object({
  Monday: z.string().describe('Comma-separated list of subjects for Monday.'),
  Tuesday: z.string().describe('Comma-separated list of subjects for Tuesday.'),
  Wednesday: z.string().describe('Comma-separated list of subjects for Wednesday.'),
  Thursday: z.string().describe('Comma-separated list of subjects for Thursday.'),
  Friday: z.string().describe('Comma-separated list of subjects for Friday.'),
  Saturday: z.string().describe('Comma-separated list of subjects for Saturday.'),
  Sunday: z.string().describe('Comma-separated list of subjects for Sunday.'),
});
export type OrganizeScheduleOutput = z.infer<typeof OrganizeScheduleOutputSchema>;

export async function organizeScheduleFromImage(input: OrganizeScheduleInput): Promise<OrganizeScheduleOutput> {
  return organizeScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'organizeSchedulePrompt',
  input: {schema: OrganizeScheduleInputSchema},
  output: {schema: OrganizeScheduleOutputSchema},
  prompt: `You are an expert schedule organizer. Your task is to analyze the provided image of a student's weekly schedule and extract the academic subjects for each day from Monday to Sunday.

The user will provide a photo of their schedule.

Your tasks are:
1.  Analyze the image to identify the **academic subjects** for each day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday).
2.  You MUST ignore non-academic activities like "Bienestar- Desayuno", "Descanso", "Almuerzo", "Salida", or any other similar entries. Only extract the actual school subjects.
3.  Format the subjects for each day as a single comma-separated string.
4.  If a day has no subjects listed, return an empty string for that day.
5.  The output must be in Spanish.

Image: {{media url=photoDataUri}}
`,
});

const organizeScheduleFlow = ai.defineFlow(
  {
    name: 'organizeScheduleFlow',
    inputSchema: OrganizeScheduleInputSchema,
    outputSchema: OrganizeScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
