"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SummaryAccordionProps {
  summary: string[];
}

export function SummaryAccordion({ summary }: SummaryAccordionProps) {
  if (!summary || summary.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="mt-2">
      <AccordionItem value="summary" className="border-none">
        <AccordionTrigger className="py-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)] hover:no-underline">
          要点 ({summary.length}件)
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            {summary.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-[color:var(--md-sys-color-outline)]">
                  ・
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
