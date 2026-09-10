import type { FileDiffLine } from "@/components/agents/file-diff";
import type { CodeBlockData, FileDiffData } from "@/types/harness";

/**
 * Mengekstrak blok <think>...</think> dari model reasoning (seperti DeepSeek R1 / Qwen QwQ).
 */
export function extractReasoning(rawText: string): { reasoning?: string; text: string } {
  const thinkMatch = rawText.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
  if (!thinkMatch) return { text: rawText };

  const reasoning = thinkMatch[1].trim();
  const text = rawText.replace(/<think>[\s\S]*?(?:<\/think>|$)/i, "").trim();
  return { reasoning, text };
}

/**
 * Mem-parsing string diff format git sederhana menjadi format FileDiffLine[].
 */
export function parseDiffLines(diffText: string): FileDiffLine[] {
  const rawLines = diffText.split("\n");
  let oldLine = 1;
  let newLine = 1;
  const result: FileDiffLine[] = [];
  let counter = 0;

  for (const line of rawLines) {
    if (line.startsWith("@@")) {
      continue;
    } else if (line.startsWith("+")) {
      result.push({
        id: `line-${++counter}`,
        type: "added",
        content: line.slice(1),
        newLine: newLine++,
      });
    } else if (line.startsWith("-")) {
      result.push({
        id: `line-${++counter}`,
        type: "removed",
        content: line.slice(1),
        oldLine: oldLine++,
      });
    } else {
      result.push({
        id: `line-${++counter}`,
        type: "context",
        content: line.startsWith(" ") ? line.slice(1) : line,
        oldLine: oldLine++,
        newLine: newLine++,
      });
    }
  }
  return result;
}

export interface ParsedBlocks {
  cleanText: string;
  diffs: FileDiffData[];
  codeBlocks: CodeBlockData[];
}

/**
 * Mem-parsing blok kode (```diff atau ```lang) dalam markdown.
 */
export function parseMarkdownBlocks(text: string): ParsedBlocks {
  const diffs: FileDiffData[] = [];
  const codeBlocks: CodeBlockData[] = [];

  const codeRegex = /```([a-zA-Z0-9_\-\.]+)?(?:\s+([^\n]+))?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = codeRegex.exec(text)) !== null) {
    const lang = (match[1] || "text").toLowerCase();
    const filename = match[2]?.trim();
    const code = match[3].trimEnd();

    if (lang === "diff" || code.startsWith("--- ") || code.startsWith("+++ ")) {
      diffs.push({
        id: `diff-${++counter}`,
        file: filename || "src/changes.patch",
        lines: parseDiffLines(code),
        language: filename?.split(".").pop() || "typescript",
      });
    } else {
      codeBlocks.push({
        id: `code-${++counter}`,
        language: lang,
        filename: filename || undefined,
        code,
      });
    }
  }

  return { cleanText: text, diffs, codeBlocks };
}
