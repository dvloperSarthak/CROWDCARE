
'use server';
/**
 * @fileOverview A Genkit flow for extracting physical descriptions from photos.
 *
 * - extractPhysicalDescription - A function that analyzes an image to describe a child.
 * - ExtractInput - The input type for the flow.
 * - ExtractOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the child as a data URI."),
});
export type ExtractInput = z.infer<typeof ExtractInputSchema>;

const ExtractOutputSchema = z.object({
  description: z.string().describe('A detailed physical description of the child based on the photo.'),
  tags: z.array(z.string()).describe('Keywords like "Red Shirt", "Blonde", "Backpack".'),
});
export type ExtractOutput = z.infer<typeof ExtractOutputSchema>;

export async function extractPhysicalDescription(input: ExtractInput): Promise<ExtractOutput> {
  return extractDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractDescriptionPrompt',
  input: {schema: ExtractInputSchema},
  output: {schema: ExtractOutputSchema},
  prompt: `You are a forensic identification AI for a rescue system. 
Analyze this photo and provide a detailed physical description suitable for identification. 
Focus on:
1. Clothing colors and types (e.g., "Blue denim jacket", "Red cap").
2. Physical traits visible (e.g., "Curly dark hair", "Glasses").
3. Distinctive items (e.g., "Spider-Man backpack").

Photo: {{media url=photoDataUri}}`,
});

const extractDescriptionFlow = ai.defineFlow(
  {
    name: 'extractDescriptionFlow',
    inputSchema: ExtractInputSchema,
    outputSchema: ExtractOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
