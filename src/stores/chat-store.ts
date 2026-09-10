import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { indexedDBStorage } from "@/lib/db";
import { listModels, streamChatCompletion, type ModelInfo } from "@/lib/api";
import { extractReasoning } from "@/lib/parser";
import { useSettingsStore } from "@/stores/settings-store";
import type { ApiProfile } from "@/lib/settings";
import type { ChatSession, HarnessMessage } from "@/types/harness";
import type { ToolApprovalStatus } from "@/components/agents/tool-approval";
import type { ApprovalCardStatus } from "@/components/agents/approval-card/types";

let currentAbortController: AbortController | null = null;
let currentLoadToken = 0;

function createSessionHelper(firstMessage?: string): ChatSession {
  const id = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const title = firstMessage
    ? firstMessage.slice(0, 26) + (firstMessage.length > 26 ? "…" : "")
    : "Percakapan Baru";
  return {
    id,
    title,
    createdAt: Date.now(),
    messages: [],
  };
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string;
  streamingId: string | null;
  models: ModelInfo[];
  modelsState: "idle" | "loading" | "ready" | "error";
  modelsError: string;
  selectedModel: string;

  // Actions
  createNewSession: () => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setActiveSessionId: (id: string) => void;
  loadModels: (profile: ApiProfile | null) => Promise<void>;
  selectModel: (model: string, profileId?: string) => void;
  sendMessage: (text: string, profile: ApiProfile | null) => void;
  stopStreaming: () => void;
  retryMessage: (assistantId: string, profile: ApiProfile | null) => void;
  handleToolApproval: (messageId: string, status: ToolApprovalStatus) => void;
  handleApprovalCard: (messageId: string, status: ApprovalCardStatus) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      const initial = createSessionHelper();
      return {
        sessions: [initial],
        activeSessionId: initial.id,
        streamingId: null,
        models: [],
        modelsState: "idle",
        modelsError: "",
        selectedModel: "",

        createNewSession: () => {
          if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
          }
          const fresh = createSessionHelper();
          set((state) => ({
            sessions: [fresh, ...state.sessions],
            activeSessionId: fresh.id,
            streamingId: null,
          }));
        },

        deleteSession: (id) => {
          set((state) => {
            const remaining = state.sessions.filter((s) => s.id !== id);
            if (remaining.length === 0) {
              const fresh = createSessionHelper();
              return {
                sessions: [fresh],
                activeSessionId: fresh.id,
                streamingId: null,
              };
            }
            const nextActive =
              state.activeSessionId === id ? remaining[0].id : state.activeSessionId;
            return {
              sessions: remaining,
              activeSessionId: nextActive,
            };
          });
        },

        renameSession: (id, title) => {
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
          }));
        },

        setActiveSessionId: (id) => {
          set({ activeSessionId: id });
        },

        loadModels: async (profile) => {
          if (!profile) {
            currentLoadToken++;
            set({ models: [], modelsState: "idle", selectedModel: "", modelsError: "" });
            return;
          }

          const token = ++currentLoadToken;
          set({ modelsState: "loading", modelsError: "" });

          try {
            const rows = await listModels(profile);
            if (token !== currentLoadToken) return;

            set({ models: rows });

            if (!rows.length) {
              set({
                modelsState: "error",
                modelsError: "Endpoint tidak mengembalikan model apa pun.",
                selectedModel: "",
              });
              return;
            }

            set({ modelsState: "ready" });

            // Restore saved model
            const settings = useSettingsStore.getState();
            const saved = settings.selectedModel[profile.id];
            const chosen = saved && rows.some((m) => m.id === saved) ? saved : (rows[0]?.id ?? "");

            set({ selectedModel: chosen });
            if (chosen && profile.id) {
              settings.selectModel(profile.id, chosen);
            }
          } catch (error) {
            if (token !== currentLoadToken) return;
            set({
              models: [],
              modelsState: "error",
              modelsError: error instanceof Error ? error.message : "Gagal memuat daftar model.",
              selectedModel: "",
            });
          }
        },

        selectModel: (model, profileId) => {
          set({ selectedModel: model });
          if (profileId) {
            useSettingsStore.getState().selectModel(profileId, model);
          }
        },

        sendMessage: (text, profile) => {
          const trimmed = text.trim();
          if (!trimmed || !profile) return;

          const state = get();
          const activeSessId =
            state.sessions.find((s) => s.id === state.activeSessionId)?.id ||
            state.sessions[0]?.id;

          if (!activeSessId) return;

          const modelToUse = state.selectedModel;
          if (!modelToUse) {
            set({ modelsError: "Pilih model terlebih dahulu pada combobox." });
            return;
          }

          const userMessage: HarnessMessage = {
            id: `u-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            role: "user",
            content: trimmed,
          };

          const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const assistantPlaceholder: HarnessMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
          };

          let historyPayload: HarnessMessage[] = [];

          // Mutasi State Atomik pada sessions
          set((prevState) => {
            return {
              streamingId: assistantId,
              sessions: prevState.sessions.map((s) => {
                if (s.id === activeSessId) {
                  const isFirst = s.messages.length === 0;
                  const updatedTitle = isFirst
                    ? trimmed.slice(0, 26) + (trimmed.length > 26 ? "…" : "")
                    : s.title;
                  const valid = s.messages.filter((m) => !m.error);
                  historyPayload = [...valid, userMessage];
                  return {
                    ...s,
                    title: updatedTitle,
                    messages: [...valid, userMessage, assistantPlaceholder],
                  };
                }
                return s;
              }),
            };
          });

          // Jalankan eksekusi streaming completion
          const controller = new AbortController();
          currentAbortController = controller;
          let rawAccumulator = "";

          const patchAssistant = (patchFn: (m: HarnessMessage) => HarnessMessage) => {
            set((prevState) => ({
              sessions: prevState.sessions.map((s) =>
                s.id === activeSessId
                  ? {
                      ...s,
                      messages: s.messages.map((m) => (m.id === assistantId ? patchFn(m) : m)),
                    }
                  : s,
              ),
            }));
          };

          const settings = useSettingsStore.getState();
          const activeSkills = settings.skills.filter((s) => s.enabled);
          const activeMcpTools = settings.mcpServers
            .filter((s) => s.enabled)
            .flatMap((s) => s.tools || []);

          let fullSystemPrompt = settings.systemPrompt;
          if (activeSkills.length > 0) {
            fullSystemPrompt +=
              "\n\nKeahlian (Skills) aktif:\n" +
              activeSkills.map((s) => `- ${s.name}: ${s.systemInstruction}`).join("\n");
          }
          if (activeMcpTools.length > 0) {
            fullSystemPrompt +=
              "\n\nTools MCP aktif:\n" +
              activeMcpTools.map((t) => `- ${t.name}: ${t.description || ""}`).join("\n");
          }

          const messagesPayload = [
            { role: "system" as const, content: fullSystemPrompt },
            ...historyPayload.map((m) => ({ role: m.role, content: m.content })),
          ];

          streamChatCompletion({
            profile,
            model: modelToUse,
            messages: messagesPayload,
            signal: controller.signal,
            onDelta: (chunk) => {
              rawAccumulator += chunk;
              const { reasoning, text: cleanText } = extractReasoning(rawAccumulator);
              patchAssistant((m) => ({
                ...m,
                content: cleanText,
                reasoning,
              }));
            },
          })
            .then(() => {
              patchAssistant((m) => ({
                ...m,
                error: m.content || m.reasoning ? undefined : "Model tidak mengembalikan konten.",
              }));
            })
            .catch((error) => {
              if (!controller.signal.aborted) {
                patchAssistant((m) => ({
                  ...m,
                  error: error instanceof Error ? error.message : "Permintaan streaming gagal.",
                }));
              }
            })
            .finally(() => {
              set({ streamingId: null });
              currentAbortController = null;
            });
        },

        stopStreaming: () => {
          if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
          }
          set({ streamingId: null });
        },

        retryMessage: (assistantId, profile) => {
          if (!profile) return;
          const state = get();
          const activeSess = state.sessions.find((s) => s.id === state.activeSessionId);
          if (!activeSess) return;

          const index = activeSess.messages.findIndex((m) => m.id === assistantId);
          if (index < 1) return;

          const history = activeSess.messages.slice(0, index).filter((m) => !m.error && m.content);
          const lastUser = [...history].reverse().find((m) => m.role === "user");
          if (!lastUser) return;

          // Kirim ulang pesan user terakhir
          get().sendMessage(lastUser.content, profile);
        },

        handleToolApproval: (messageId, status) => {
          const state = get();
          const activeSessId = state.activeSessionId;
          set((prevState) => ({
            sessions: prevState.sessions.map((s) =>
              s.id === activeSessId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === messageId && m.toolApproval
                        ? { ...m, toolApproval: { ...m.toolApproval, status } }
                        : m,
                    ),
                  }
                : s,
            ),
          }));
        },

        handleApprovalCard: (messageId, status) => {
          const state = get();
          const activeSessId = state.activeSessionId;
          set((prevState) => ({
            sessions: prevState.sessions.map((s) =>
              s.id === activeSessId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === messageId && m.approvalCard
                        ? { ...m, approvalCard: { ...m.approvalCard, status } }
                        : m,
                    ),
                  }
                : s,
            ),
          }));
        },
      };
    },
    {
      name: "bechat.sessions.idb",
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
