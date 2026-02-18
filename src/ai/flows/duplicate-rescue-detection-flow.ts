'use server';
/**
 * @fileOverview A Genkit flow for detecting duplicate rescue alerts in the CrowdCare Guardian system.
 *
 * - detectDuplicateRescueAlert - A function that handles the duplicate rescue detection process.
 * - DuplicateRescueDetectionInput - The input type for the detectDuplicateRescueAlert function.
 * - DuplicateRescueDetectionOutput - The return type for the detectDuplicateRescueAlert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for detecting duplicate rescue alerts
const DuplicateRescueDetectionInputSchema = z.object({
  childId: z.string().describe('The unique ID of the child involved in the new rescue alert (e.g., C2045).'),
  location: z.string().describe('The GPS location of the new rescue alert (e.g., "34.0522, -118.2437").'),
  timestamp: z.string().datetime().describe('The timestamp of the new rescue alert in ISO 8601 format (e.g., "2023-10-27T10:30:00Z").'),
  recentAlerts: z.array(z.object({
    alertId: z.string().describe('The unique ID of a past rescue alert.'),
    childId: z.string().describe('The unique ID of the child in the past rescue alert.'),
    location: z.string().describe('The GPS location of the past rescue alert.'),
    timestamp: z.string().datetime().describe('The timestamp of the past rescue alert in ISO 8601 format.'),
  })).describe('A list of recent rescue alerts to compare against for duplication.'),
});
export type DuplicateRescueDetectionInput = z.infer<typeof DuplicateRescueDetectionInputSchema>;

// Output schema for detecting duplicate rescue alerts
const DuplicateRescueDetectionOutputSchema = z.object({
  isDuplicate: z.boolean().describe('True if the new alert is considered a duplicate, false otherwise.'),
  duplicateOfAlertId: z.string().optional().describe('The ID of the recent alert that this new alert is a duplicate of, if any.'),
  reason: z.string().describe('A brief explanation for the duplicate detection decision.'),
});
export type DuplicateRescueDetectionOutput = z.infer<typeof DuplicateRescueDetectionOutputSchema>;

// Define the prompt for the duplicate rescue detection
const duplicateRescueDetectionPrompt = ai.definePrompt({
  name: 'duplicateRescueDetectionPrompt',
  input: {schema: DuplicateRescueDetectionInputSchema},
  output: {schema: DuplicateRescueDetectionOutputSchema},
  prompt: `You are an AI assistant for the CrowdCare Guardian rescue system. Your primary role is to accurately identify and flag potential duplicate rescue alerts to help control room operators focus on unique incidents.

Carefully analyze the "New Rescue Alert" and compare it against the "Recent Rescue Alerts" provided.

A rescue alert is considered a duplicate if:
1. It concerns the SAME CHILD ID.
2. It occurs at a VERY SIMILAR LOCATION (within a short distance).
3. It occurs within a SHORT TIME FRAME (e.g., typically within 5-10 minutes) of a recent alert.
   However, if the child ID and location are identical, a slightly longer time frame might still indicate a duplicate, especially if there's no logical reason for a new separate alert.

Prioritize child ID and location similarity. Timestamp is a secondary factor, helping to confirm if it's indeed the same incident being reported multiple times.

**New Rescue Alert:**
Child ID: {{{childId}}}
Location: {{{location}}}
Timestamp: {{{timestamp}}}

**Recent Rescue Alerts for comparison:**
{{#if recentAlerts.length}}
{{#each recentAlerts}}
- Alert ID: {{this.alertId}}
  Child ID: {{this.childId}}
  Location: {{this.location}}
  Timestamp: {{this.timestamp}}
{{/each}}
{{else}}
No recent alerts provided for comparison. Assume it is not a duplicate based on this list.
{{/if}}

Based on your analysis, determine if the "New Rescue Alert" is a duplicate of any of the "Recent Rescue Alerts".
If it is a duplicate, set 'isDuplicate' to true, provide the 'alertId' of the alert it duplicates in 'duplicateOfAlertId', and give a concise 'reason'.
If it is not a duplicate, set 'isDuplicate' to false and provide a 'reason' explaining why it's considered unique or if no recent alerts were available for comparison.`,
});

// Define the Genkit flow
const duplicateRescueDetectionFlow = ai.defineFlow(
  {
    name: 'duplicateRescueDetectionFlow',
    inputSchema: DuplicateRescueDetectionInputSchema,
    outputSchema: DuplicateRescueDetectionOutputSchema,
  },
  async (input) => {
    const {output} = await duplicateRescueDetectionPrompt(input);
    return output!;
  }
);

export async function detectDuplicateRescueAlert(input: DuplicateRescueDetectionInput): Promise<DuplicateRescueDetectionOutput> {
  return duplicateRescueDetectionFlow(input);
}
