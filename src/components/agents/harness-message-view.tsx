"use client";

import { AgentActivity } from "@/components/agents/agent-activity";
import { Citations } from "@/components/agents/citations";
import { CodePreviewBlock } from "@/components/agents/code-preview-block";
import { FileDiff } from "@/components/agents/file-diff";
import { ImageGeneration } from "@/components/agents/image-generation";
import { MarkdownResponse } from "@/components/agents/markdown-response";
import { StreamingResponse } from "@/components/agents/streaming-response";
import { ToolResult } from "@/components/agents/tool-result";
import type { HarnessMessage } from "@/types/harness";
import { cn } from "@/lib/utils";

interface HarnessMessageViewProps {
  message: HarnessMessage;
  isStreaming: boolean;
  onRetry?: () => void;
}

export function HarnessMessageView({
  message,
  isStreaming,
  onRetry,
}: HarnessMessageViewProps) {
  const approvalCardStatus = message.approvalCard?.status ?? "pending";

  const explicitDiffs = message.fileDiffs || [];
  const explicitCodeBlocks = message.codeBlocks || [];

  return (
    <div className="flex w-full flex-col gap-3.5">
      {/* 1. Agent Activity & Reasoning */}
      {(message.activities && message.activities.length > 0) || message.reasoning ? (
        <AgentActivity
          items={
            message.activities ?? [
              {
                id: "reasoning-item",
                type: "trace",
                kind: "thinking",
                label: "Proses Berpikir & Reasoning",
                detail: message.reasoning,
              },
            ]
          }
          status={isStreaming ? "working" : "complete"}
          defaultOpen={isStreaming}
        />
      ) : null}

      {/* 2. Todo List */}
      {message.todos && message.todos.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-card/60 p-2.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-semibold text-foreground">Rencana Tugas ({message.todos.length} task)</span>
            <span className="text-[11px] text-muted-foreground">Lihat kartu floating di kanan atas ↗</span>
          </div>
        </div>
      ) : null}

      {/* 3. Tool Approval Card (jika sudah di-approve/deny, tampilkan status riwayat) */}
      {message.toolApproval && message.toolApproval.status !== "pending" ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs">
          <span className="font-semibold text-foreground">{message.toolApproval.tool}:</span>
          <span className="text-muted-foreground">{message.toolApproval.title}</span>
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              message.toolApproval.status === "approved"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500",
            )}
          >
            {message.toolApproval.status}
          </span>
        </div>
      ) : null}

      {/* 4. Approval Card (Decisions / Multi-choice) */}
      {message.approvalCard && message.approvalCard.status !== "pending" ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs">
          <span className="font-semibold text-foreground">Keputusan:</span>
          <span className="text-muted-foreground">{message.approvalCard.title}</span>
          <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
            {approvalCardStatus}
          </span>
        </div>
      ) : null}

      {/* 5. Tool Results (Terminal / Output) */}
      {message.tools && message.tools.length > 0
        ? message.tools.map((t) => (
            <ToolResult
              key={t.id}
              tool={t.tool}
              title={t.title}
              kind={t.kind ?? "terminal"}
              status={t.status ?? "success"}
              meta={t.meta}
              copyText={t.content}
            >
              <pre className="font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {t.content}
              </pre>
            </ToolResult>
          ))
        : null}

      {/* 6. Explicit File Diffs (jika di luar markdown) */}
      {explicitDiffs.map((d) => (
        <FileDiff
          key={d.id}
          file={d.file}
          lines={d.lines}
          language={d.language as any}
          defaultOpen={true}
        />
      ))}

      {/* 7. Explicit Code Blocks (jika di luar markdown) */}
      {explicitCodeBlocks.map((cb) => (
        <CodePreviewBlock
          key={cb.id}
          id={cb.id}
          code={cb.code}
          language={cb.language}
          filename={cb.filename}
        />
      ))}

      {/* 8. Citations / Sources */}
      {message.citations && message.citations.length > 0 ? (
        <Citations
          title="Sumber & Referensi"
          citations={message.citations}
          defaultOpen={false}
        />
      ) : null}

      {/* 9. Image Generation */}
      {message.images && message.images.length > 0
        ? message.images.map((img) => (
            <ImageGeneration
              key={img.id}
              prompt={img.prompt}
              label={img.label}
              status={img.status}
              aspectRatio="16/9"
              size="fluid"
            >
              {img.imageUrl ? (
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  className="h-full w-full object-cover rounded-xl"
                />
              ) : null}
            </ImageGeneration>
          ))
        : null}

      {/* 10. Streaming Markdown Response (Markdown + Shiki Code + Live SVG/HTML Preview) */}
      {message.content ? (
        <StreamingResponse
          status={
            message.error ? "error" : isStreaming ? "streaming" : "complete"
          }
          copyText={message.content}
          onRetry={message.error ? onRetry : undefined}
          showActions={!isStreaming}
        >
          <MarkdownResponse content={message.content} />
        </StreamingResponse>
      ) : null}
    </div>
  );
}
