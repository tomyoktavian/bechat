"use client";

import { motion } from "motion/react";
import { ShieldAlert, Sparkles } from "lucide-react";
import { ToolApproval, type ToolApprovalStatus } from "@/components/agents/tool-approval";
import { ApprovalCard } from "@/components/agents/approval-card";
import type { ApprovalCardStatus } from "@/components/agents/approval-card/types";
import type { ToolApprovalData, ApprovalCardData } from "@/types/harness";

interface AttachedApprovalProps {
  toolApproval?: ToolApprovalData;
  approvalCard?: ApprovalCardData;
  onToolApprovalChange?: (status: ToolApprovalStatus) => void;
  onApprovalCardChange?: (status: ApprovalCardStatus) => void;
}

export function AttachedApproval({
  toolApproval,
  approvalCard,
  onToolApprovalChange,
  onApprovalCardChange,
}: AttachedApprovalProps) {
  const hasPendingTool = Boolean(toolApproval && toolApproval.status === "pending");
  const hasPendingCard = Boolean(approvalCard && approvalCard.status === "pending");

  if (!hasPendingTool && !hasPendingCard) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="mb-2 w-full overflow-hidden rounded-2xl border border-amber-500/30 bg-card/95 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-amber-500/10 px-3.5 py-1.5 text-xs text-amber-600 dark:text-amber-400">
        <div className="flex items-center gap-1.5 font-medium">
          {hasPendingTool ? (
            <ShieldAlert className="size-3.5" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          <span>
            {hasPendingTool
              ? "Izin Eksekusi Aksi Diperlukan"
              : "Konfirmasi Keputusan Agent"}
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          Security Gate
        </span>
      </div>

      <div className="p-2">
        {hasPendingTool && toolApproval ? (
          <ToolApproval
            tool={toolApproval.tool}
            title={toolApproval.title}
            description={toolApproval.description}
            parameters={toolApproval.parameters}
            status={toolApproval.status}
            defaultOpen={true}
            onApprove={() => onToolApprovalChange?.("approved")}
            onAlwaysAllow={() => onToolApprovalChange?.("approved")}
            onDeny={() => onToolApprovalChange?.("denied")}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        ) : null}

        {hasPendingCard && approvalCard ? (
          <ApprovalCard
            title={approvalCard.title}
            description={approvalCard.description}
            questions={approvalCard.questions}
            status={approvalCard.status}
            onApprove={() => onApprovalCardChange?.("approved")}
            onReject={() => onApprovalCardChange?.("rejected")}
            onDismiss={() => onApprovalCardChange?.("approved")}
            onSubmit={() => onApprovalCardChange?.("answered")}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        ) : null}
      </div>
    </motion.div>
  );
}
