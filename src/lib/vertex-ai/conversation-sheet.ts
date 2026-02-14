import { vertexAI, MODEL_NAME } from "./client";
import {
  buildConversationSheetPrompt,
  CONVERSATION_SHEET_RESPONSE_SCHEMA,
} from "@/lib/prompts/conversation-sheet";
import type { Message } from "@/types/message";

interface RawConversationSheetResult {
  title: string;
  markdown: string;
}

export interface ConversationSheetGenerationResult {
  title: string;
  markdown: string;
  promptTokens: number;
  completionTokens: number;
}

const TITLE_MAX_CHARS = 80;
const MARKDOWN_MAX_CHARS = 20000;
const MESSAGE_ID_MARKER_PATTERN =
  /\(?\s*(?:message[\s_-]*id|msg[\s_-]*id)\s*[:=]\s*[^)\]\s]+?\)?/gi;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const MSG_TOKEN_PATTERN = /\b(?:msg|message)[_-][0-9a-z]{6,}\b/gi;
const EMPTY_FILLER_PATTERN =
  /^(?:none|n\/a|na|nothing|no pending items?|not applicable)$/i;
const EMPTY_SECTION_TITLE_PATTERN =
  /^(?:decisions?|open questions?|next actions?)$/i;

function clampChars(text: string, maxChars: number): string {
  return Array.from(text).slice(0, maxChars).join("");
}

function formatHistory(messages: Message[]): string {
  return messages
    .slice(-30)
    .map((message) => `[${message.role}]\n${message.content}`)
    .join("\n\n---\n\n");
}

function stripMessageIdMarkers(markdown: string): string {
  return markdown
    .replace(MESSAGE_ID_MARKER_PATTERN, "")
    .replace(UUID_PATTERN, "")
    .replace(MSG_TOKEN_PATTERN, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEscapedNewlines(markdown: string): string {
  const escapedNewlineCount = (markdown.match(/\\n/g) || []).length;
  if (!escapedNewlineCount) {
    return markdown;
  }

  const hasRealLineBreak = markdown.includes("\n");
  if (!hasRealLineBreak || escapedNewlineCount >= 2) {
    return markdown
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  return markdown;
}

function normalizeLineForEmptyCheck(line: string): string {
  return line
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isEffectivelyEmptySectionBody(bodyLines: string[]): boolean {
  const normalized = bodyLines
    .map(normalizeLineForEmptyCheck)
    .filter((line) => line.length > 0);

  if (!normalized.length) {
    return true;
  }

  return normalized.every((line) => EMPTY_FILLER_PATTERN.test(line));
}

function prunePlaceholderSections(markdown: string): string {
  const lines = markdown.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const headingMatch = /^(#{2,6})\s+(.+?)\s*$/.exec(line);

    if (!headingMatch) {
      output.push(line);
      i += 1;
      continue;
    }

    const title = headingMatch[2].trim();
    let j = i + 1;
    const bodyLines: string[] = [];
    while (j < lines.length && !/^(#{1,6})\s+/.test(lines[j])) {
      bodyLines.push(lines[j]);
      j += 1;
    }

    const emptyBody = isEffectivelyEmptySectionBody(bodyLines);
    const shouldDropSection =
      emptyBody || EMPTY_SECTION_TITLE_PATTERN.test(title) && emptyBody;

    if (!shouldDropSection) {
      output.push(line, ...bodyLines);
    }

    i = j;
  }

  return output
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ensureHeadingStructure(markdown: string, title: string): string {
  const lines = markdown.split("\n");
  const hasH1 = lines.some((line) => /^#\s+/.test(line));
  const h2Count = lines.filter((line) => /^##\s+/.test(line)).length;
  const safeTitle = title || "Conversation Summary";

  let text = markdown.trim();

  if (!hasH1) {
    text = `# ${safeTitle}\n\n${text}`;
  }

  if (h2Count < 2) {
    const body = text
      .replace(/^#\s+.*\n?/m, "")
      .trim();

    text = [
      `# ${safeTitle}`,
      "",
      "## Summary",
      body || "-",
      "",
      "## Key Points",
      "-",
    ].join("\n");
  }

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSheet(raw: RawConversationSheetResult): RawConversationSheetResult {
  const title = clampChars((raw.title || "").trim(), TITLE_MAX_CHARS);
  const decodedMarkdown = decodeEscapedNewlines(raw.markdown || "");
  const sanitizedMarkdown = stripMessageIdMarkers(decodedMarkdown);
  const prunedMarkdown = prunePlaceholderSections(sanitizedMarkdown);
  const structuredMarkdown = ensureHeadingStructure(prunedMarkdown, title);
  const markdown = clampChars(structuredMarkdown, MARKDOWN_MAX_CHARS);

  if (!title) {
    throw new Error("Invalid sheet title");
  }
  if (!markdown) {
    throw new Error("Invalid sheet markdown");
  }

  return { title, markdown };
}

export async function generateConversationSheet(
  messages: Message[],
  additionalInstruction?: string
): Promise<ConversationSheetGenerationResult> {
  const prompt = buildConversationSheetPrompt(
    formatHistory(messages),
    additionalInstruction
  );

  try {
    return await generateStructured(prompt);
  } catch (error) {
    console.warn("Structured conversation sheet generation failed:", error);
    return generateText(prompt);
  }
}

async function generateStructured(
  prompt: string
): Promise<ConversationSheetGenerationResult> {
  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CONVERSATION_SHEET_RESPONSE_SCHEMA,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = JSON.parse(text) as RawConversationSheetResult;
  const normalized = normalizeSheet(parsed);
  const usage = result.response.usageMetadata;

  return {
    title: normalized.title,
    markdown: normalized.markdown,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}

async function generateText(
  prompt: string
): Promise<ConversationSheetGenerationResult> {
  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as RawConversationSheetResult;
  const normalized = normalizeSheet(parsed);
  const usage = result.response.usageMetadata;

  return {
    title: normalized.title,
    markdown: normalized.markdown,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}
