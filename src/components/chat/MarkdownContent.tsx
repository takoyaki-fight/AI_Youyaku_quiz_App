"use client";

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
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "break-words text-sm leading-relaxed",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-1",
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
          createRemarkTermMentions(mentions),
        ]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a({ href, children, ...props }) {
            if (href?.startsWith(TERM_LINK_PREFIX)) {
              const termId = decodeURIComponent(href.slice(TERM_LINK_PREFIX.length));
              const term = terms.find((t) => t.termId === termId);
              return (
                <TermPopover term={term}>
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
