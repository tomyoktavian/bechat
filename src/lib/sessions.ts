import type { ChatSession } from "@/types/harness";

const SESSIONS_KEY = "bechat.sessions.v1";
const ACTIVE_SESSION_KEY = "bechat.active_session.v1";

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // quota or private mode error ignore
  }
}

export function loadActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function saveActiveSessionId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

export function createNewSession(firstMessage?: string): ChatSession {
  const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const title = firstMessage ? firstMessage.slice(0, 28) + (firstMessage.length > 28 ? "…" : "") : "Percakapan Baru";
  return {
    id,
    title,
    createdAt: Date.now(),
    messages: [],
  };
}
