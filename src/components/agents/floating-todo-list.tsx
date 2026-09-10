"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ListTodo, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TodoList, type TodoItem } from "@/components/agents/todo-list";
import { cn } from "@/lib/utils";

interface FloatingTodoListProps {
  items: TodoItem[];
  defaultMinimized?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function FloatingTodoList({
  items,
  defaultMinimized = false,
  onDismiss,
  className,
}: FloatingTodoListProps) {
  const [minimized, setMinimized] = useState(defaultMinimized);

  if (!items || items.length === 0) return null;

  const completedCount = items.filter((t) => t.status === "completed").length;
  const inProgressCount = items.filter((t) => t.status === "in-progress").length;
  const isAllComplete = completedCount === items.length;

  return (
    <div
      className={cn(
        "pointer-events-auto z-20 flex flex-col items-end transition-all",
        className,
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        {minimized ? (
          // Compact Floating Pill Badge
          <motion.button
            key="minimized"
            type="button"
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            onClick={() => setMinimized(false)}
            aria-label="Buka Rencana Tugas"
            className="flex items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-md transition-colors hover:border-border-strong hover:bg-card"
          >
            {isAllComplete ? (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            ) : (
              <ListTodo className="size-3.5 text-primary" />
            )}
            <span>
              {completedCount}/{items.length} Selesai
            </span>
            {inProgressCount > 0 ? (
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            ) : null}
            <ChevronDown className="size-3 text-muted-foreground" />
          </motion.button>
        ) : (
          // Expanded Floating Card
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            className="w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ListTodo className="size-3.5 text-primary" />
                <span>Rencana Kerja Agent</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                  {completedCount}/{items.length}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  aria-label="Minimize Todo"
                  className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                {onDismiss ? (
                  <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Tutup Todo"
                    className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-1.5">
              <TodoList
                items={items}
                defaultOpen={true}
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
