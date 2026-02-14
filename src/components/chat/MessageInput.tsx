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
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const canSend = value.trim() && !disabled;

  return (
    <div className="border-t bg-white/80 backdrop-blur-sm p-4">
      <div className="flex gap-2 max-w-4xl mx-auto items-end">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            disabled={disabled}
            className="resize-none min-h-[48px] max-h-[200px] pr-4 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200 transition-colors"
            rows={1}
          />
          <p className="text-[10px] text-gray-300 mt-1 ml-1">
            Shift+Enter で改行
          </p>
        </div>
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={`shrink-0 w-10 h-10 rounded-xl mb-5 transition-all ${
            canSend
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-200"
              : "bg-gray-200 text-gray-400"
          }`}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SendHorizonal className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
