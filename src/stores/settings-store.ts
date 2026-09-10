import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { indexedDBStorage } from "@/lib/db";
import {
  createId,
  emptySettings,
  type AgentSkillConfig,
  type ApiProfile,
  type AppSettings,
  type McpServerConfig,
} from "@/lib/settings";

interface SettingsState extends AppSettings {
  // Actions
  setSettings: (updater: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => void;
  addProfile: (profile: Omit<ApiProfile, "id">) => void;
  updateProfile: (profile: ApiProfile) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  selectModel: (profileId: string, model: string) => void;
  toggleMcpServer: (id: string, enabled: boolean) => void;
  saveMcpServer: (server: Partial<McpServerConfig> & { name: string }) => void;
  removeMcpServer: (id: string) => void;
  toggleSkill: (id: string, enabled: boolean) => void;
  toggleSkillApproval: (id: string, mode: "ask" | "auto") => void;
  saveSkill: (skill: Partial<AgentSkillConfig> & { name: string }) => void;
  removeSkill: (id: string) => void;
  resetAllSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...emptySettings,

      setSettings: (updater) => {
        set((state) => {
          if (typeof updater === "function") {
            return updater(state);
          }
          return { ...state, ...updater };
        });
      },

      addProfile: (profileData) => {
        const id = createId("api");
        const newProfile: ApiProfile = { ...profileData, id };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          activeProfileId: state.activeProfileId ?? id,
        }));
      },

      updateProfile: (updated) => {
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === updated.id ? updated : p)),
        }));
      },

      removeProfile: (id) => {
        set((state) => {
          const remaining = state.profiles.filter((p) => p.id !== id);
          const nextActive =
            state.activeProfileId === id
              ? remaining[0]?.id ?? null
              : state.activeProfileId;
          const { [id]: _, ...restModels } = state.selectedModel;
          return {
            profiles: remaining,
            activeProfileId: nextActive,
            selectedModel: restModels,
          };
        });
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      selectModel: (profileId, model) => {
        set((state) => ({
          selectedModel: { ...state.selectedModel, [profileId]: model },
        }));
      },

      toggleMcpServer: (id, enabled) => {
        set((state) => ({
          mcpServers: state.mcpServers.map((s) => (s.id === id ? { ...s, enabled } : s)),
        }));
      },

      saveMcpServer: (serverDraft) => {
        set((state) => {
          const newServer: McpServerConfig = {
            id: serverDraft.id || createId("mcp"),
            name: serverDraft.name.trim(),
            transport: serverDraft.transport || "sse",
            url: serverDraft.url?.trim(),
            command: serverDraft.command?.trim(),
            authType: serverDraft.authType || "none",
            apiKey: serverDraft.apiKey?.trim(),
            headerName: serverDraft.headerName?.trim(),
            enabled: true,
            status: "online",
            tools: serverDraft.tools || [],
          };
          const exists = state.mcpServers.some((s) => s.id === newServer.id);
          return {
            mcpServers: exists
              ? state.mcpServers.map((s) => (s.id === newServer.id ? newServer : s))
              : [...state.mcpServers, newServer],
          };
        });
      },

      removeMcpServer: (id) => {
        set((state) => ({
          mcpServers: state.mcpServers.filter((s) => s.id !== id),
        }));
      },

      toggleSkill: (id, enabled) => {
        set((state) => ({
          skills: state.skills.map((s) => (s.id === id ? { ...s, enabled } : s)),
        }));
      },

      toggleSkillApproval: (id, mode) => {
        set((state) => ({
          skills: state.skills.map((s) => (s.id === id ? { ...s, approvalMode: mode } : s)),
        }));
      },

      saveSkill: (skillDraft) => {
        set((state) => {
          const newSkill: AgentSkillConfig = {
            id: skillDraft.id || createId("skill"),
            name: skillDraft.name.trim(),
            description: skillDraft.description?.trim() || "Kustom skill pengguna",
            icon: skillDraft.icon || "sparkles",
            enabled: skillDraft.enabled ?? true,
            approvalMode: skillDraft.approvalMode || "auto",
            systemInstruction:
              skillDraft.systemInstruction?.trim() ||
              `Gunakan keahlian ${skillDraft.name} saat pengguna meminta tugas terkait.`,
            isCustom: true,
          };
          const exists = state.skills.some((s) => s.id === newSkill.id);
          return {
            skills: exists
              ? state.skills.map((s) => (s.id === newSkill.id ? newSkill : s))
              : [...state.skills, newSkill],
          };
        });
      },

      removeSkill: (id) => {
        set((state) => ({
          skills: state.skills.filter((s) => s.id !== id),
        }));
      },

      resetAllSettings: () => {
        set((state) => ({
          ...emptySettings,
          profiles: state.profiles, // pertahankan profil API pengguna
        }));
      },
    }),
    {
      name: "bechat.settings.idb",
      storage: createJSONStorage(() => indexedDBStorage),
    },
  ),
);
