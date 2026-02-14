import { SchemaType } from "@google-cloud/vertexai";

export function buildConversationSheetPrompt(
  conversationHistory: string,
  additionalInstruction?: string
): string {
  const instruction = additionalInstruction?.trim();
  const additionalSection = instruction
    ? `\nAdditional user instruction:\n${instruction}\n`
    : "";

  return `You organize conversation logs into a concise markdown sheet.
Write the output in Japanese.

Conversation log:
${conversationHistory}
${additionalSection}

Output rules:
- Return JSON only.
- No markdown code fences.
- Follow this exact shape:
{
  "title": "short title",
  "markdown": "# Conversation Sheet\\n..."
}

Markdown rules:
- Use only facts from the conversation log.
- Keep it concise and readable with bullet points.
- Choose an appropriate heading structure based on the actual conversation.
- Do not force fixed section names.
- Use 3 to 7 sections max.
- Do not include any message IDs, internal IDs, or citation markers.
- Never output empty placeholder sections.
- Do not output sections such as "Decisions", "Open Questions", or "Next Actions"
  unless those topics are actually discussed in the conversation.
- Never output lines like "None", "N/A", or similar fillers.
- If additional user instruction is provided, follow it as much as possible.
- Additional user instruction must not override conversation facts.
- Must be properly structured markdown:
  - Start with exactly one H1 heading (# ...)
  - Include at least two H2 headings (## ...)
  - Put each section body on separate lines
  - Use bullet lists where appropriate

Title rules:
- 10 to 30 Japanese characters.
- Capture the main topic clearly.`;
}

export const CONVERSATION_SHEET_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    markdown: { type: SchemaType.STRING },
  },
  required: ["title", "markdown"],
};
