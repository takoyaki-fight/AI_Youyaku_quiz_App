"use client";

import { isValidElement, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { TermPopover } from "./TermPopover";

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
  mentions?: MentionInfo[];
  terms?: TermInfo[];
  termFollowupTurns?: Record<string, FollowupTurn[]>;
  onAppendTermFollowupTurn?: (termKey: string, turn: FollowupTurn) => void;
}

interface TermInfo {
  termId: string;
  surface: string;
  reading: string;
  definition: string;
  category: string;
}

interface MentionInfo {
  termId: string;
  surface: string;
  startOffset: number;
  endOffset: number;
}

interface FollowupTurn {
  question: string;
  answer: string;
}

const TERM_LINK_PREFIX = "#term:";

type MdNode = {
  type?: string;
  value?: string;
  url?: string;
  children?: MdNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

function normalizeTermId(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeSurface(value: string): string {
  return value
    .trim()
    .replace(/^[「『（(【\[]+/, "")
    .replace(/[」』）)】\]]+$/, "")
    .trim();
}

function extractTextFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => extractTextFromNode(child)).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTextFromNode(node.props.children);
  }
  return "";
}

function splitTextNodeByFallbackStrong(node: MdNode): MdNode[] {
  const value = node.value;
  if (typeof value !== "string" || !value.includes("**")) {
    return [node];
  }

  const pieces: MdNode[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const open = value.indexOf("**", cursor);
    if (open === -1) {
      break;
    }

    if (open > cursor) {
      pieces.push({
        type: "text",
        value: value.slice(cursor, open),
      });
    }

    const isEscaped = open > 0 && value[open - 1] === "\\";
    if (isEscaped) {
      pieces.push({ type: "text", value: "**" });
      cursor = open + 2;
      continue;
    }

    const close = value.indexOf("**", open + 2);
    if (close === -1) {
      pieces.push({ type: "text", value: value.slice(open) });
      cursor = value.length;
      break;
    }

    const inner = value.slice(open + 2, close);
    const hasInnerText = inner.trim().length > 0;
    const hasBoundaryWhitespace =
      /^[\s\u3000]/.test(inner) || /[\s\u3000]$/.test(inner);

    if (!hasInnerText || hasBoundaryWhitespace) {
      pieces.push({ type: "text", value: value.slice(open, close + 2) });
      cursor = close + 2;
      continue;
    }

    pieces.push({
      type: "strong",
      children: [{ type: "text", value: inner }],
    });
    cursor = close + 2;
  }

  if (cursor < value.length) {
    pieces.push({
      type: "text",
      value: value.slice(cursor),
    });
  }

  return pieces.length ? pieces : [node];
}

function remarkFallbackStrong() {
  const blockedTypes = new Set([
    "link",
    "linkReference",
    "inlineCode",
    "code",
    "math",
    "inlineMath",
    "html",
    "strong",
  ]);

  return function transformer(tree: MdNode) {
    const walk = (node: MdNode, blocked: boolean) => {
      if (!Array.isArray(node.children)) {
        return;
      }

      const nowBlocked = blocked || blockedTypes.has(node.type || "");
      const nextChildren: MdNode[] = [];

      for (const child of node.children) {
        if (!nowBlocked && child.type === "text") {
          nextChildren.push(...splitTextNodeByFallbackStrong(child));
        } else {
          nextChildren.push(child);
        }
      }

      node.children = nextChildren;

      for (const child of node.children) {
        walk(child, nowBlocked);
      }
    };

    walk(tree, false);
  };
}

function normalizeMentions(mentions: MentionInfo[]): MentionInfo[] {
  const sorted = [...mentions]
    .filter(
      (m) =>
        Number.isInteger(m.startOffset) &&
        Number.isInteger(m.endOffset) &&
        m.startOffset >= 0 &&
        m.endOffset > m.startOffset
    )
    .sort((a, b) => a.startOffset - b.startOffset);

  const normalized: MentionInfo[] = [];

  for (const mention of sorted) {
    const last = normalized[normalized.length - 1];
    if (!last || mention.startOffset >= last.endOffset) {
      normalized.push(mention);
    }
  }

  return normalized;
}

function splitTextNodeByMentions(node: MdNode, mentions: MentionInfo[]): MdNode[] {
  const value = node.value;
  const nodeStart = node.position?.start?.offset;
  const nodeEnd = node.position?.end?.offset;

  if (
    typeof value !== "string" ||
    typeof nodeStart !== "number" ||
    typeof nodeEnd !== "number" ||
    nodeEnd <= nodeStart
  ) {
    return [node];
  }

  const contained = mentions.filter(
    (m) => m.startOffset >= nodeStart && m.endOffset <= nodeEnd
  );

  if (!contained.length) {
    return [node];
  }

  const pieces: MdNode[] = [];
  let cursor = nodeStart;

  for (const mention of contained) {
    if (mention.startOffset < cursor) {
      continue;
    }

    const prefixStart = cursor - nodeStart;
    const prefixEnd = mention.startOffset - nodeStart;
    if (prefixEnd > prefixStart) {
      pieces.push({
        type: "text",
        value: value.slice(prefixStart, prefixEnd),
      });
    }

    const mentionStart = mention.startOffset - nodeStart;
    const mentionEnd = mention.endOffset - nodeStart;
    const mentionText = value.slice(mentionStart, mentionEnd);
    if (mentionText) {
      pieces.push({
        type: "link",
        url: `${TERM_LINK_PREFIX}${encodeURIComponent(mention.termId)}`,
        children: [{ type: "text", value: mentionText }],
      });
      cursor = mention.endOffset;
    }
  }

  const tailStart = cursor - nodeStart;
  if (tailStart < value.length) {
    pieces.push({
      type: "text",
      value: value.slice(tailStart),
    });
  }

  return pieces.length ? pieces : [node];
}

function createRemarkTermMentions(mentions: MentionInfo[]) {
  const normalized = normalizeMentions(mentions);
  const blockedTypes = new Set([
    "link",
    "linkReference",
    "inlineCode",
    "code",
    "math",
    "inlineMath",
    "html",
  ]);

  return function remarkTermMentions() {
    return function transformer(tree: MdNode) {
      if (!normalized.length) {
        return;
      }

      const walk = (node: MdNode, blocked: boolean) => {
        if (!Array.isArray(node.children)) {
          return;
        }

        const nowBlocked = blocked || blockedTypes.has(node.type || "");
        const nextChildren: MdNode[] = [];

        for (const child of node.children) {
          if (!nowBlocked && child.type === "text") {
            nextChildren.push(...splitTextNodeByMentions(child, normalized));
          } else {
            nextChildren.push(child);
          }
        }

        node.children = nextChildren;

        for (const child of node.children) {
          walk(child, nowBlocked);
        }
      };

      walk(tree, false);
    };
  };
}

export function MarkdownContent({
  content,
  isUser = false,
  mentions = [],
  terms = [],
  termFollowupTurns = {},
  onAppendTermFollowupTurn,
}: MarkdownContentProps) {
  const [openPopoverKey, setOpenPopoverKey] = useState<string | null>(null);
  const occurrenceByTermKey = new Map<string, number>();

  return (
    <div
      className={cn(
        "break-words text-sm leading-relaxed",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-1",
        "[&_strong]:font-bold",
        "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-2",
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5",
        "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
        "[&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium",
        "[&_td]:border [&_td]:px-2 [&_td]:py-1",
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3",
        "[&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md",
        isUser
          ? "[&_a]:text-[color:var(--md-sys-color-on-primary-container)] [&_a]:underline [&_a:hover]:opacity-80 [&_blockquote]:border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_60%)] [&_pre]:bg-[color:color-mix(in_srgb,var(--md-sys-color-primary-container),black_10%)] [&_code]:bg-[color:color-mix(in_srgb,var(--md-sys-color-primary-container),black_7%)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded"
          : "[&_a]:text-primary [&_a]:underline [&_a:hover]:brightness-90 [&_blockquote]:border-border [&_pre]:bg-[color:var(--md-sys-color-inverse-surface)] [&_pre]:text-[color:var(--md-sys-color-inverse-on-surface)] [&_code]:bg-[color:var(--md-sys-color-surface-container)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkMath,
          remarkBreaks,
          remarkFallbackStrong,
          createRemarkTermMentions(mentions),
        ]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a({ href, children, ...props }) {
            const linkText = extractTextFromNode(children).trim();
            const normalizedLinkText = normalizeSurface(linkText);
            const matchedBySurface = linkText
              ? terms.find((t) => normalizeSurface(t.surface) === normalizedLinkText)
              : undefined;

            if (href?.startsWith(TERM_LINK_PREFIX)) {
              const rawTermId = decodeURIComponent(
                href.slice(TERM_LINK_PREFIX.length)
              );
              const normalizedTermId = normalizeTermId(rawTermId);

              const term =
                terms.find(
                  (t) => normalizeTermId(t.termId) === normalizedTermId
                ) ?? matchedBySurface;

              const termForPopover =
                term ??
                (linkText
                  ? {
                      termId: normalizedTermId || `surface:${linkText}`,
                      surface: linkText,
                      reading: "",
                      definition:
                        "この用語の詳細データが見つかりませんでした。下の入力欄で補足質問できます。",
                      category: "concept",
                    }
                  : undefined);

              const termKey =
                normalizeTermId(termForPopover?.termId) ||
                normalizedTermId ||
                (linkText ? `surface:${linkText}` : "unknown");
              const occurrence = occurrenceByTermKey.get(termKey) ?? 0;
              occurrenceByTermKey.set(termKey, occurrence + 1);
              const mentionKey = `${termKey}:${occurrence}`;
              return (
                <TermPopover
                  term={termForPopover}
                  sharedTurns={termFollowupTurns[termKey] ?? []}
                  onAppendSharedTurn={(turn) =>
                    onAppendTermFollowupTurn?.(termKey, turn)
                  }
                  open={openPopoverKey === mentionKey}
                  onOpenChange={(nextOpen) =>
                    setOpenPopoverKey((current) => {
                      if (nextOpen) return mentionKey;
                      return current === mentionKey ? null : current;
                    })
                  }
                >
                  <span
                    className={cn(
                      "underline decoration-dotted cursor-pointer hover:opacity-80",
                      isUser
                        ? "text-[color:var(--md-sys-color-on-primary-container)]"
                        : "text-primary"
                    )}
                  >
                    {children}
                  </span>
                </TermPopover>
              );
            }

            const canFallbackToTermPopover =
              matchedBySurface &&
              (!href ||
                href === "#" ||
                href.startsWith("#") ||
                href === linkText);

            if (canFallbackToTermPopover) {
              const termForPopover = matchedBySurface;
              const termKey = normalizeTermId(termForPopover.termId) || `surface:${termForPopover.surface}`;
              const occurrence = occurrenceByTermKey.get(termKey) ?? 0;
              occurrenceByTermKey.set(termKey, occurrence + 1);
              const mentionKey = `${termKey}:${occurrence}`;

              return (
                <TermPopover
                  term={termForPopover}
                  sharedTurns={termFollowupTurns[termKey] ?? []}
                  onAppendSharedTurn={(turn) =>
                    onAppendTermFollowupTurn?.(termKey, turn)
                  }
                  open={openPopoverKey === mentionKey}
                  onOpenChange={(nextOpen) =>
                    setOpenPopoverKey((current) => {
                      if (nextOpen) return mentionKey;
                      return current === mentionKey ? null : current;
                    })
                  }
                >
                  <span
                    className={cn(
                      "underline decoration-dotted cursor-pointer hover:opacity-80",
                      isUser
                        ? "text-[color:var(--md-sys-color-on-primary-container)]"
                        : "text-primary"
                    )}
                  >
                    {children}
                  </span>
                </TermPopover>
              );
            }

            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
