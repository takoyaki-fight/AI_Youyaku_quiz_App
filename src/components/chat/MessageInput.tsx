"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Loader2 } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const canSend = Boolean(value.trim()) && !disabled;

  return (
    <div className="sticky bottom-0 z-20 border-t border-border/70 bg-[color:var(--md-sys-color-surface-container-low)]/95 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-end gap-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="質問や要点を入力してください"
            disabled={disabled}
            className="min-h-[52px] max-h-[200px] resize-none pr-4"
            rows={1}
          />
          <p className="ml-1 mt-1 text-[10px] text-[color:var(--md-sys-color-on-surface-variant)]">
            Shift+Enter で改行
          </p>
        </div>
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="mb-5 shrink-0"
          aria-label="メッセージを送信"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
