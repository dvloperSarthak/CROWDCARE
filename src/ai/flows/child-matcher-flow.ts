
'use server';
/**
 * @fileOverview A Genkit flow for matching a manual description to registered children.
 *
 * - findChildMatch - A function that handles the AI matching process.
 * - ChildMatchInput - The input type for the findChildMatch function.
 * - ChildMatchOutput - The return type for the findChildMatch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChildMatchInputSchema = z.object({
  description: z.string().describe('The volunteer\'s description of the found child (e.g., clothes, age, hair).'),
  registry: z.array(z.object({
    id: z.string(),
    childName: z.string(),
    age: z.number(),
    physicalDescription: z.string().optional(),
  })).describe('List of registered children to compare against.'),
});
export type ChildMatchInput = z.infer<typeof ChildMatchInputSchema>;

const ChildMatchOutputSchema = z.object({
  matches: z.array(z.object({
    childId: z.string(),
    confidence: z.number().describe('Confidence score from 0 to 100.'),
    reason: z.string().describe('Briefly explain why this is a match.'),
  })),
  bestMatchId: z.string().optional(),
});
export type ChildMatchOutput = z.infer<typeof ChildMatchOutputSchema>;

const childMatchPrompt = ai.definePrompt({
  name: 'childMatchPrompt',
  input: {schema: ChildMatchInputSchema},
  output: {schema: ChildMatchOutputSchema},
  prompt: `You are a tactical rescue AI for the CrowdCare system. A volunteer found a child but cannot scan the QR code.
They have provided this description: "{{{description}}}"

Search the following registry of registered children and identify potential matches based on age and physical description (clothing, traits, etc).

Registry:
{{#each registry}}
- ID: {{this.id}} | Name: {{this.childName}} | Age: {{this.age}} | Description: {{this.physicalDescription}}
{{/each}}

Rank the top 3 potential matches. If a match is highly likely (>80%), set it as 'bestMatchId'.`,
});

const childMatchFlow = ai.defineFlow(
  {
    name: 'childMatchFlow',
    inputSchema: ChildMatchInputSchema,
    outputSchema: ChildMatchOutputSchema,
  },
  async (input) => {
    const {output} = await childMatchPrompt(input);
    return output!;
  }
);

export async function findChildMatch(input: ChildMatchInput): Promise<ChildMatchOutput> {
  return childMatchFlow(input);
}
