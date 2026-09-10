"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodePreviewBlock } from "@/components/agents/code-preview-block";
import { FileDiff } from "@/components/agents/file-diff";
import { parseDiffLines } from "@/lib/parser";

interface MarkdownResponseProps {
  content: string;
  className?: string;
}

export function MarkdownResponse({ content, className }: MarkdownResponseProps) {
  const components = useMemo(
    () => ({
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match ? match[1] : "";
        const codeString = String(children || "").replace(/\n$/, "");

        // Jika inline code (misal `npm install`)
        if (inline || (!match && !codeString.includes("\n"))) {
          return (
            <code
              className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.88em] text-foreground"
              {...props}
            >
              {children}
            </code>
          );
        }

        // Jika diff block
        if (lang === "diff" || codeString.startsWith("--- ") || codeString.startsWith("+++ ")) {
          const lines = parseDiffLines(codeString);
          return (
            <div className="my-3 w-full">
              <FileDiff
                file="changes.patch"
                lines={lines}
                language="typescript"
                defaultOpen={true}
              />
            </div>
          );
        }

        // Jika blok kode umum / SVG / HTML
        return (
          <div className="my-3 w-full">
            <CodePreviewBlock
              id={`cb-${Math.random().toString(36).slice(2, 7)}`}
              code={codeString}
              language={lang || "text"}
            />
          </div>
        );
      },

      h1({ children }: any) {
        return (
          <h1 className="mt-5 mb-2.5 text-lg font-bold tracking-tight text-foreground border-b border-border/40 pb-1.5">
            {children}
          </h1>
        );
      },
      h2({ children }: any) {
        return (
          <h2 className="mt-4 mb-2 text-base font-semibold tracking-tight text-foreground">
            {children}
          </h2>
        );
      },
      h3({ children }: any) {
        return (
          <h3 className="mt-3 mb-1.5 text-sm font-semibold text-foreground">
            {children}
          </h3>
        );
      },
      p({ children }: any) {
        return (
          <p className="my-2 text-sm leading-relaxed text-foreground/90">
            {children}
          </p>
        );
      },
      ul({ children }: any) {
        return (
          <ul className="my-2.5 list-disc pl-5 space-y-1 text-sm text-foreground/90">
            {children}
          </ul>
        );
      },
      ol({ children }: any) {
        return (
          <ol className="my-2.5 list-decimal pl-5 space-y-1 text-sm text-foreground/90">
            {children}
          </ol>
        );
      },
      li({ children }: any) {
        return <li className="leading-relaxed">{children}</li>;
      },
      blockquote({ children }: any) {
        return (
          <blockquote className="my-3 border-l-2 border-primary/70 bg-muted/20 pl-3.5 py-1 text-sm italic text-muted-foreground rounded-r-lg">
            {children}
          </blockquote>
        );
      },
      table({ children }: any) {
        return (
          <div className="my-3.5 w-full overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs border-collapse">
              {children}
            </table>
          </div>
        );
      },
      thead({ children }: any) {
        return <thead className="border-b border-border bg-muted/60 text-foreground font-semibold">{children}</thead>;
      },
      th({ children }: any) {
        return <th className="px-3.5 py-2.5 font-medium">{children}</th>;
      },
      td({ children }: any) {
        return <td className="border-b border-border/40 px-3.5 py-2 text-muted-foreground last:border-0">{children}</td>;
      },
      a({ href, children }: any) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          >
            {children}
          </a>
        );
      },
      hr() {
        return <hr className="my-4 border-border/60" />;
      },
    }),
    [],
  );

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
