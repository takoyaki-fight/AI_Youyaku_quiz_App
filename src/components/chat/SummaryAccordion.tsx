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
        <AccordionTrigger className="py-1 text-xs text-gray-500 hover:no-underline">
          要約 ({summary.length}項目)
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 text-xs text-gray-600">
            {summary.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
