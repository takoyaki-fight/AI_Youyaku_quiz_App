import { ConversationSidebar } from "@/components/chat/ConversationSidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <ConversationSidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--md-sys-color-surface-container-lowest)]/60">
        {children}
      </div>
    </div>
  );
}
