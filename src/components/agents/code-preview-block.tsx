"use client";

import { useState } from "react";
import { Code2, Download, Eye, RotateCw } from "lucide-react";
import { CodeBlock } from "@/components/agents/code-block";
import { Button } from "@/components/motion/button";
import { cn } from "@/lib/utils";

interface CodePreviewBlockProps {
  id?: string;
  code: string;
  language?: string;
  filename?: string;
}

export function CodePreviewBlock({
  code,
  language = "text",
  filename,
}: CodePreviewBlockProps) {
  const isSvg =
    language === "svg" ||
    language === "xml" ||
    /<svg[\s\S]*<\/svg>/i.test(code);

  const isHtml =
    !isSvg &&
    (language === "html" ||
      language === "htm" ||
      /<(!DOCTYPE\s+html|html|body|div|button|section|main|h1|h2|p)[\s\S]*>/i.test(code));

  const hasPreview = isSvg || isHtml;

  const [activeTab, setActiveTab] = useState<"preview" | "code">(
    hasPreview ? "preview" : "code",
  );
  const [iframeKey, setIframeKey] = useState(0);

  // Ekstrak tag svg murni jika ada
  const svgMatch = code.match(/<svg[\s\S]*?<\/svg>/i);
  const svgContent = svgMatch ? svgMatch[0] : code;

  const downloadFile = (ext: string, mime: string) => {
    const content = isSvg ? svgContent : code;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `render.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // HTML source doc dengan styling reset dasar dan tema
  const htmlDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body {
            margin: 0;
            padding: 1rem;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            background: transparent;
            color: #f3f4f6;
          }
        </style>
      </head>
      <body>
        ${code}
      </body>
    </html>
  `;

  if (!hasPreview) {
    return (
      <CodeBlock
        code={code}
        language={language as any}
        filename={filename}
        showLineNumbers={true}
      />
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === "preview"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="size-3.5" />
            <span>{isSvg ? "SVG Visual Preview" : "Live Web Preview"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === "code"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Code2 className="size-3.5" />
            <span>Kode {isSvg ? "SVG" : language.toUpperCase()}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono text-muted-foreground">
            {filename || (isSvg ? "graphic.svg" : "index.html")}
          </span>
          {isHtml && activeTab === "preview" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIframeKey((k) => k + 1)}
              aria-label="Reload Preview"
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <RotateCw className="size-3" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              downloadFile(
                isSvg ? "svg" : "html",
                isSvg ? "image/svg+xml" : "text/html",
              )
            }
            aria-label={`Unduh ${isSvg ? "SVG" : "HTML"}`}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {activeTab === "preview" ? (
        <div className="w-full">
          {isSvg ? (
            <div className="flex min-h-52 w-full items-center justify-center p-6 bg-[radial-gradient(#80808025_1px,transparent_1px)] [background-size:16px_16px]">
              <div
                className="flex max-h-96 max-w-full items-center justify-center overflow-auto rounded-xl p-4 drop-shadow-md [&>svg]:max-h-80 [&>svg]:w-auto [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          ) : (
            <div className="relative min-h-64 w-full bg-neutral-900/50 p-2">
              <iframe
                key={iframeKey}
                title="HTML Preview"
                srcDoc={htmlDoc}
                sandbox="allow-scripts allow-same-origin"
                className="h-72 w-full rounded-xl border border-border/50 bg-neutral-950"
              />
            </div>
          )}
        </div>
      ) : (
        <CodeBlock
          code={code}
          language={isSvg ? "xml" : (language as any)}
          filename={filename}
          showLineNumbers={true}
          className="rounded-none border-0"
        />
      )}
    </div>
  );
}
