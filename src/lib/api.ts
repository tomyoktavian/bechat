import type { ApiProfile } from "@/lib/settings";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function authHeaders(profile: ApiProfile): HeadersInit {
  return profile.apiKey.trim()
    ? { Authorization: `Bearer ${profile.apiKey.trim()}` }
    : {};
}

export interface ModelInfo {
  id: string;
  ownedBy?: string;
}

/** GET {baseUrl}/models — OpenAI-compatible model listing. */
export async function listModels(profile: ApiProfile): Promise<ModelInfo[]> {
  const response = await fetch(`${normalizeBaseUrl(profile.baseUrl)}/models`, {
    headers: authHeaders(profile),
  });
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errorText = await response.text();
      try {
        const parsed = JSON.parse(errorText);
        errorDetail = parsed.error?.message || parsed.message || errorText;
      } catch {
        errorDetail = errorText.slice(0, 150);
      }
    } catch {
      // ignore
    }
    throw new Error(
      errorDetail
        ? `${errorDetail} (HTTP ${response.status})`
        : `HTTP ${response.status} — ${response.statusText}`,
    );
  }
  const data: unknown = await response.json();
  const rows = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as { data?: unknown[] }).data)
      ? (data as { data: unknown[] }).data
      : [];
  return rows
    .map((row) => {
      if (typeof row === "string") return { id: row };
      if (typeof row === "object" && row !== null && "id" in row) {
        const record = row as { id?: unknown; owned_by?: unknown };
        return {
          id: String(record.id ?? ""),
          ownedBy:
            typeof record.owned_by === "string" ? record.owned_by : undefined,
        };
      }
      return { id: "" };
    })
    .filter((model) => model.id.length > 0);
}

export interface StreamChatOptions {
  profile: ApiProfile;
  model: string;
  messages: ChatMessage[];
  signal: AbortSignal;
  /** Called for every streamed text delta. */
  onDelta: (text: string) => void;
}

/** POST {baseUrl}/chat/completions with stream:true, parsing SSE deltas and fallback. */
export async function streamChatCompletion({
  profile,
  model,
  messages,
  signal,
  onDelta,
}: StreamChatOptions): Promise<void> {
  const response = await fetch(
    `${normalizeBaseUrl(profile.baseUrl)}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(profile),
      },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    },
  );

  if (!response.ok) {
    let detail = "";
    try {
      const errorText = await response.text();
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed.error?.message || parsed.message || errorText;
      } catch {
        detail = errorText.slice(0, 240);
      }
    } catch {
      // ignore
    }
    throw new Error(
      detail
        ? `${detail} (HTTP ${response.status})`
        : `HTTP ${response.status} — ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") || "";

  // Jika response adalah JSON langsung (bukan SSE stream)
  if (contentType.includes("application/json") && !contentType.includes("text/event-stream")) {
    const json = (await response.json()) as any;
    const content =
      json.choices?.[0]?.message?.content ||
      json.choices?.[0]?.delta?.content ||
      json.choices?.[0]?.text ||
      "";
    if (content) onDelta(content);
    return;
  }

  if (!response.body) {
    throw new Error("Respons tidak memiliki body untuk dibaca.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as any;
        const choice = parsed.choices?.[0];
        const delta = choice?.delta;
        const text =
          delta?.content ??
          delta?.reasoning_content ??
          delta?.text ??
          choice?.text ??
          "";
        if (text) onDelta(text);
      } catch {
        // skip keep-alive comments / partial JSON
      }
    }
  }
}
