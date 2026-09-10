import type { AgentActivityItem } from "@/components/agents/agent-activity/types";
import type { TodoItem } from "@/components/agents/todo-list";
import type { CitationItem } from "@/components/agents/citations";
import type { ToolApprovalParameter, ToolApprovalStatus } from "@/components/agents/tool-approval";
import type { FileDiffLine } from "@/components/agents/file-diff";
import type { ApprovalCardQuestion, ApprovalCardStatus } from "@/components/agents/approval-card/types";
import type { ToolResultKind, ToolResultStatus } from "@/components/agents/tool-result";

export interface ToolResultData {
  id: string;
  tool: string;
  title: string;
  content: string;
  kind?: ToolResultKind;
  status?: ToolResultStatus;
  meta?: string;
}

export interface ToolApprovalData {
  id: string;
  tool: string;
  title?: string;
  description?: string;
  parameters?: ToolApprovalParameter[];
  status: ToolApprovalStatus;
}

export interface ApprovalCardData {
  id: string;
  title: string;
  description?: string;
  questions?: ApprovalCardQuestion[];
  status: ApprovalCardStatus;
}

export interface FileDiffData {
  id: string;
  file: string;
  lines: FileDiffLine[];
  language?: string;
}

export interface CodeBlockData {
  id: string;
  code: string;
  language?: string;
  filename?: string;
}

export interface ImageGenData {
  id: string;
  prompt: string;
  label?: string;
  imageUrl?: string;
  status: "queued" | "generating" | "complete" | "error";
}

export interface HarnessMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
  // AI Harness Extras
  reasoning?: string;
  activities?: AgentActivityItem[];
  tools?: ToolResultData[];
  toolApproval?: ToolApprovalData;
  approvalCard?: ApprovalCardData;
  todos?: TodoItem[];
  fileDiffs?: FileDiffData[];
  citations?: CitationItem[];
  images?: ImageGenData[];
  codeBlocks?: CodeBlockData[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: HarnessMessage[];
  model?: string;
}
