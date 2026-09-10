"use client";

import {
  Activity,
  Check,
  Cpu,
  FileCode2,
  Globe,
  KeyRound,
  Layers,
  ListTodo,
  Palette,
  Pencil,
  Plus,
  PlugZap,
  RotateCw,
  Server,
  Sliders,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { Loader } from "@/components/motion/loader";
import { Switch } from "@/components/motion/switch";
import { listModels } from "@/lib/api";
import { pingMcpServer } from "@/lib/mcp";
import { useSettingsStore } from "@/stores/settings-store";
import {
  activeProfile,
  createId,
  defaultSkills,
  defaultSystemPrompt,
  emptySettings,
  type AgentSkillConfig,
  type AppSettings,
  type McpServerConfig,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

interface DraftProfile {
  id: string | null;
  name: string;
  baseUrl: string;
  apiKey: string;
}

const emptyDraftProfile: DraftProfile = { id: null, name: "", baseUrl: "", apiKey: "" };

type SettingsTab = "api" | "mcp" | "skills" | "model" | "appearance";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings?: AppSettings;
  onSettingsChange?: (settings: AppSettings) => void;
}

export function SettingsModal({
  open,
  onClose,
  settings: propSettings,
  onSettingsChange: propOnSettingsChange,
}: SettingsModalProps) {
  const storeSettings = useSettingsStore();
  const settings = propSettings || storeSettings;
  const onSettingsChange = (updated: AppSettings) => {
    if (propOnSettingsChange) {
      propOnSettingsChange(updated);
    }
    useSettingsStore.getState().setSettings(updated);
  };
  const [activeTab, setActiveTab] = useState<SettingsTab>("api");

  // 1. State API Profile
  const [draftProfile, setDraftProfile] = useState<DraftProfile | null>(null);
  const [profileFormError, setProfileFormError] = useState<string | undefined>(undefined);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<
    { ok: true; count: number } | { ok: false; message: string } | null
  >(null);

  // 2. State MCP Servers (dengan Autentikasi)
  const [mcpDraft, setMcpDraft] = useState<Partial<McpServerConfig> | null>(null);
  const [testingMcpId, setTestingMcpId] = useState<string | null>(null);
  const [mcpPingResult, setMcpPingResult] = useState<Record<string, string>>({});

  // 3. State Kustom Skills
  const [skillDraft, setSkillDraft] = useState<Partial<AgentSkillConfig> | null>(null);

  const current = activeProfile(settings);

  // Helper Simpan Profil API
  const saveDraftProfile = () => {
    if (!draftProfile) return;
    const baseUrl = draftProfile.baseUrl.trim();
    if (!/^https?:\/\//i.test(baseUrl)) {
      setProfileFormError("Base URL harus diawali http:// atau https://");
      return;
    }
    const name = draftProfile.name.trim() || safeHostName(baseUrl);
    if (draftProfile.id) {
      onSettingsChange({
        ...settings,
        profiles: settings.profiles.map((p) =>
          p.id === draftProfile.id ? { ...p, name, baseUrl, apiKey: draftProfile.apiKey } : p,
        ),
      });
    } else {
      const id = createId("api");
      onSettingsChange({
        ...settings,
        profiles: [...settings.profiles, { id, name, baseUrl, apiKey: draftProfile.apiKey }],
        activeProfileId: settings.activeProfileId ?? id,
      });
    }
    setDraftProfile(null);
  };

  const removeProfile = (id: string) => {
    const remaining = settings.profiles.filter((p) => p.id !== id);
    const nextActive =
      settings.activeProfileId === id
        ? (remaining[0]?.id ?? null)
        : settings.activeProfileId;
    const { [id]: _removed, ...restModels } = settings.selectedModel;
    onSettingsChange({
      ...settings,
      profiles: remaining,
      activeProfileId: nextActive,
      selectedModel: restModels,
    });
  };

  const testApiConnection = async () => {
    if (!draftProfile) return;
    if (!/^https?:\/\//i.test(draftProfile.baseUrl.trim())) {
      setProfileFormError("Base URL harus diawali http:// atau https://");
      return;
    }
    setTestingApi(true);
    setApiTestResult(null);
    try {
      const models = await listModels({
        id: draftProfile.id ?? "draft",
        name: draftProfile.name,
        baseUrl: draftProfile.baseUrl,
        apiKey: draftProfile.apiKey,
      });
      setApiTestResult({ ok: true, count: models.length });
    } catch (error) {
      setApiTestResult({
        ok: false,
        message: error instanceof Error ? error.message : "Koneksi gagal.",
      });
    } finally {
      setTestingApi(false);
    }
  };

  // Helper MCP Server dengan Autentikasi
  const toggleMcpServer = (serverId: string, enabled: boolean) => {
    onSettingsChange({
      ...settings,
      mcpServers: settings.mcpServers.map((s) => (s.id === serverId ? { ...s, enabled } : s)),
    });
  };

  const testMcp = async (server: McpServerConfig) => {
    setTestingMcpId(server.id);
    try {
      const res = await pingMcpServer(server);
      setMcpPingResult((prev) => ({ ...prev, [server.id]: res.message }));
      if (res.tools.length > 0) {
        onSettingsChange({
          ...settings,
          mcpServers: settings.mcpServers.map((s) =>
            s.id === server.id ? { ...s, status: res.ok ? "online" : "error", tools: res.tools } : s,
          ),
        });
      }
    } catch (err: any) {
      setMcpPingResult((prev) => ({ ...prev, [server.id]: err.message || "Gagal ping" }));
    } finally {
      setTestingMcpId(null);
    }
  };

  const saveMcpDraft = () => {
    if (!mcpDraft || !mcpDraft.name?.trim()) return;
    const newServer: McpServerConfig = {
      id: mcpDraft.id || createId("mcp"),
      name: mcpDraft.name.trim(),
      transport: mcpDraft.transport || "sse",
      url: mcpDraft.url?.trim(),
      command: mcpDraft.command?.trim(),
      authType: mcpDraft.authType || "none",
      apiKey: mcpDraft.apiKey?.trim(),
      headerName: mcpDraft.headerName?.trim(),
      enabled: true,
      status: "online",
      tools: mcpDraft.tools || [],
    };
    const exists = settings.mcpServers.some((s) => s.id === newServer.id);
    onSettingsChange({
      ...settings,
      mcpServers: exists
        ? settings.mcpServers.map((s) => (s.id === newServer.id ? newServer : s))
        : [...settings.mcpServers, newServer],
    });
    setMcpDraft(null);
  };

  const removeMcpServer = (serverId: string) => {
    onSettingsChange({
      ...settings,
      mcpServers: settings.mcpServers.filter((s) => s.id !== serverId),
    });
  };

  // Helper Agent Skills & Kustom Skills
  const toggleSkill = (skillId: string, enabled: boolean) => {
    onSettingsChange({
      ...settings,
      skills: settings.skills.map((s) => (s.id === skillId ? { ...s, enabled } : s)),
    });
  };

  const toggleSkillApproval = (skillId: string, mode: "ask" | "auto") => {
    onSettingsChange({
      ...settings,
      skills: settings.skills.map((s) => (s.id === skillId ? { ...s, approvalMode: mode } : s)),
    });
  };

  const saveSkillDraft = () => {
    if (!skillDraft || !skillDraft.name?.trim()) return;
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
    const exists = settings.skills.some((s) => s.id === newSkill.id);
    onSettingsChange({
      ...settings,
      skills: exists
        ? settings.skills.map((s) => (s.id === newSkill.id ? newSkill : s))
        : [...settings.skills, newSkill],
    });
    setSkillDraft(null);
  };

  const removeSkill = (skillId: string) => {
    onSettingsChange({
      ...settings,
      skills: settings.skills.filter((s) => s.id !== skillId),
    });
  };

  // Helper Reset ke Default
  const resetAllSettings = () => {
    if (confirm("Kembalikan seluruh pengaturan ke default pabrik?")) {
      onSettingsChange({
        ...emptySettings,
        profiles: settings.profiles,
      });
    }
  };

  const skillIcon = (icon: AgentSkillConfig["icon"]) => {
    switch (icon) {
      case "terminal":
        return <Terminal className="size-4" />;
      case "palette":
        return <Palette className="size-4" />;
      case "file-code":
        return <FileCode2 className="size-4" />;
      case "list-todo":
        return <ListTodo className="size-4" />;
      case "sparkles":
        return <Sparkles className="size-4" />;
      case "globe":
        return <Globe className="size-4" />;
      default:
        return <Activity className="size-4" />;
    }
  };

  const navItems = [
    {
      id: "api" as const,
      label: "Koneksi API",
      icon: <Server className="size-4" />,
      badge: settings.profiles.length > 0 ? settings.profiles.length : undefined,
    },
    {
      id: "mcp" as const,
      label: "MCP Servers",
      icon: <Layers className="size-4" />,
      badge: settings.mcpServers.filter((s) => s.enabled).length,
    },
    {
      id: "skills" as const,
      label: "Agent Skills",
      icon: <Wand2 className="size-4" />,
      badge: settings.skills.filter((s) => s.enabled).length,
    },
    {
      id: "model" as const,
      label: "Model & System",
      icon: <Cpu className="size-4" />,
    },
    {
      id: "appearance" as const,
      label: "Tampilan & Data",
      icon: <Palette className="size-4" />,
    },
  ];

  const tabTitles: Record<SettingsTab, { title: string; subtitle: string }> = {
    api: {
      title: "Koneksi & Penyedia API",
      subtitle: "Kelola endpoint kompatibel format OpenAI (/v1/models & /v1/chat/completions)",
    },
    mcp: {
      title: "Model Context Protocol (MCP) Servers",
      subtitle: "Integrasi server tools & resources dengan dukungan autentikasi Bearer, API Key, dan SSE",
    },
    skills: {
      title: "Keahlian Agent & Security Gates",
      subtitle: "Kelola 6 skill bawaan dan buat kustom skill baru dengan aturan izin eksekusi",
    },
    model: {
      title: "Parameter Model & System Prompt",
      subtitle: "Instruksi dasar harness, temperatur kreativitas, dan konfigurasi streaming SSE",
    },
    appearance: {
      title: "Preferensi Tampilan & Penyimpanan",
      subtitle: "Pilihan tema antarmuka dan opsi tampilan syntax highlighting blok kode",
    },
  };

  return (
    <MorphingModal
      viewId={open ? "settings" : null}
      onClose={onClose}
      placement="center"
      className="max-w-4xl w-[94vw] md:w-full h-[640px] max-h-[92vh] rounded-2xl border border-border bg-card p-0 shadow-2xl overflow-hidden"
      contentClassName="p-0 h-full w-full flex flex-col min-h-0"
    >
      <div
        className="pointer-events-auto flex h-full w-full flex-col md:flex-row overflow-hidden bg-card min-h-0"
        style={{ height: "640px", maxHeight: "90vh" }}
      >
        {/* ================= SISI KIRI: MENU NAVIGASI TAB ================= */}
        <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20 flex flex-col justify-between overflow-hidden">
          <div className="flex flex-col p-2.5 md:p-3 min-h-0">
            {/* Logo & Judul Settings (dengan tombol Close di mobile) */}
            <div className="flex items-center justify-between gap-2.5 px-2 py-2 md:py-3 mb-1 md:mb-2 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
                  <Sliders className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs font-semibold tracking-tight text-foreground truncate">
                    Pengaturan Workspace
                  </h2>
                  <p className="text-[10px] text-muted-foreground truncate">beChat Harness v1.0</p>
                </div>
              </div>

              {/* Tombol Tutup X khusus di Mobile header */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tutup Dialog"
                onClick={onClose}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground md:hidden shrink-0"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Tombol Tab Vertikal di Desktop / Horizontal Scroll di Mobile */}
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto py-1 md:py-0 scrollbar-none min-h-0">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all text-left whitespace-nowrap md:whitespace-normal shrink-0 md:shrink",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(isActive ? "text-primary-foreground" : "text-muted-foreground")}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.2 text-[9.5px] font-semibold",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer Kiri: Status Model Aktif */}
          <div className="hidden md:block border-t border-border/80 p-3 text-[11px] text-muted-foreground shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <Server className="size-3 shrink-0 text-primary" />
              <span className="truncate font-medium text-foreground">
                {current ? current.name : "Belum ada API"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5 font-mono">
              {current ? current.baseUrl : "Konfigurasi di tab API"}
            </p>
          </div>
        </aside>

        {/* ================= SISI KANAN: KONTEN TAB PENGATURAN ================= */}
        <main className="flex min-w-0 flex-1 flex-col h-full overflow-hidden bg-card/60">
          {/* Header Konten Kanan (Desktop) */}
          <header className="hidden md:flex items-center justify-between border-b border-border px-6 py-3.5 bg-muted/10 shrink-0">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {tabTitles[activeTab].title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tabTitles[activeTab].subtitle}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup Dialog"
              onClick={onClose}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0 ml-4"
            >
              <X className="size-4" />
            </Button>
          </header>

          {/* Area Isi Form Tab (Scrollable Lancar dengan overscroll-contain) */}
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
            style={{ maxHeight: "calc(100% - 60px)" }}
          >
            {/* 1. KONTEN TAB: KONEKSI API */}
            {activeTab === "api" ? (
              draftProfile === null ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Daftar Endpoint Terdaftar</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Pilih satu profil sebagai endpoint default untuk obrolan chat
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setApiTestResult(null);
                        setProfileFormError(undefined);
                        setDraftProfile(emptyDraftProfile);
                      }}
                      className="text-xs gap-1.5"
                    >
                      <Plus className="size-3.5" /> Tambah API
                    </Button>
                  </div>

                  {settings.profiles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-strong p-8 text-center">
                      <Server className="mx-auto size-8 text-muted-foreground opacity-60" />
                      <p className="mt-2 text-xs font-medium text-foreground">Belum ada API terdaftar</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Tambahkan endpoint OpenAI, Ollama lokal, 9router, atau Groq untuk mulai mengobrol.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {settings.profiles.map((profile) => (
                        <div
                          key={profile.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                            profile.id === settings.activeProfileId
                              ? "border-primary/60 bg-primary/5 shadow-xs"
                              : "border-border hover:border-border-strong bg-card/70",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSettingsChange({ ...settings, activeProfileId: profile.id })}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span
                              className={cn(
                                "grid size-4 shrink-0 place-items-center rounded-full border",
                                profile.id === settings.activeProfileId
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border-strong",
                              )}
                            >
                              {profile.id === settings.activeProfileId ? <Check className="size-2.5" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-foreground">
                                {profile.name}
                                {profile.id === current?.id ? (
                                  <span className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-emerald-500">
                                    aktif
                                  </span>
                                ) : null}
                              </span>
                              <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                                {profile.baseUrl}
                              </span>
                            </span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setApiTestResult(null);
                              setProfileFormError(undefined);
                              setDraftProfile({ ...profile });
                            }}
                            className="size-7 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProfile(profile.id)}
                            className="size-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-w-lg">
                  <h4 className="text-xs font-semibold text-foreground">
                    {draftProfile.id ? "Edit Profil API" : "Tambah Profil API Baru"}
                  </h4>
                  <Input
                    label="Nama Profil"
                    placeholder="Contoh: 9router lokal / OpenAI / Ollama"
                    value={draftProfile.name}
                    onChange={(val) => setDraftProfile({ ...draftProfile, name: val })}
                  />
                  <Input
                    label="Base URL"
                    placeholder="http://localhost:20128/v1 atau https://api.openai.com/v1"
                    value={draftProfile.baseUrl}
                    onChange={(val) => {
                      setDraftProfile({ ...draftProfile, baseUrl: val });
                      setProfileFormError(undefined);
                    }}
                    error={profileFormError}
                    success={/^https?:\/\//i.test(draftProfile.baseUrl.trim())}
                  />
                  <Input
                    label="API Key"
                    type="password"
                    placeholder="sk-... (kosongkan bila tidak diperlukan)"
                    value={draftProfile.apiKey}
                    onChange={(val) => setDraftProfile({ ...draftProfile, apiKey: val })}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={testApiConnection} disabled={testingApi}>
                      {testingApi ? <Loader variant="dots" size={12} label="Menguji" /> : <PlugZap className="size-3.5" />}
                      <span>Tes Koneksi</span>
                    </Button>
                    <Button size="sm" onClick={saveDraftProfile}>
                      Simpan Profil
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDraftProfile(null)}>
                      Batal
                    </Button>
                  </div>

                  {apiTestResult ? (
                    <p
                      className={cn(
                        "rounded-xl p-2.5 text-xs",
                        apiTestResult.ok
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20",
                      )}
                    >
                      {apiTestResult.ok
                        ? `Berhasil! Terdeteksi ${apiTestResult.count} model di endpoint ini.`
                        : `Gagal: ${apiTestResult.message}`}
                    </p>
                  ) : null}
                </div>
              )
            ) : null}

            {/* 2. KONTEN TAB: MCP SERVERS (DENGAN DUKUNGAN AUTENTIKASI) */}
            {activeTab === "mcp" ? (
              mcpDraft === null ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Model Context Protocol Servers</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Koneksi server tools & context via protokol standar MCP (SSE, HTTP, Stdio) dengan Autentikasi
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setMcpDraft({
                          name: "",
                          transport: "sse",
                          url: "http://localhost:8787/mcp",
                          authType: "none",
                          apiKey: "",
                          headerName: "X-API-Key",
                          enabled: true,
                          tools: [],
                        })
                      }
                      className="text-xs gap-1.5"
                    >
                      <Plus className="size-3.5" /> Tambah Server MCP
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {settings.mcpServers.map((server) => (
                      <div
                        key={server.id}
                        className={cn(
                          "flex flex-col gap-2.5 rounded-xl border p-3.5 transition-colors bg-card/70",
                          server.enabled ? "border-border" : "border-border/40 opacity-70",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                              <Layers className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-foreground truncate">{server.name}</span>
                                <span className="rounded bg-muted px-1.5 py-0.2 text-[9.5px] font-mono uppercase text-muted-foreground">
                                  {server.transport}
                                </span>
                                {server.authType && server.authType !== "none" ? (
                                  <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.2 text-[9.5px] font-medium text-amber-500">
                                    <KeyRound className="size-2.5" />
                                    {server.authType === "bearer"
                                      ? "Bearer"
                                      : server.headerName || "API Key"}
                                  </span>
                                ) : (
                                  <span className="rounded bg-muted/60 px-1.5 py-0.2 text-[9.5px] text-muted-foreground">
                                    No Auth
                                  </span>
                                )}
                                {server.status === "online" ? (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    Online
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <span className="size-1.5 rounded-full bg-muted-foreground" />
                                    Siap
                                  </span>
                                )}
                              </div>
                              <span className="block truncate font-mono text-[10.5px] text-muted-foreground mt-0.5">
                                {server.url || server.command || "Local transport"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => testMcp(server)}
                              disabled={testingMcpId === server.id}
                              className="h-7 text-xs gap-1"
                            >
                              {testingMcpId === server.id ? (
                                <Loader variant="dots" size={10} label="Testing" />
                              ) : (
                                <RotateCw className="size-3" />
                              )}
                              <span>Ping Tools</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMcpDraft({ ...server })}
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Switch
                              checked={server.enabled}
                              onCheckedChange={(val) => toggleMcpServer(server.id, val)}
                              ariaLabel={`Toggle ${server.name}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMcpServer(server.id)}
                              className="size-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Ping Feedback */}
                        {mcpPingResult[server.id] ? (
                          <div className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                            {mcpPingResult[server.id]}
                          </div>
                        ) : null}

                        {/* Registered Tools */}
                        {server.tools && server.tools.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                            <span className="text-[10.5px] font-medium text-muted-foreground">Tools terdaftar:</span>
                            {server.tools.map((t, idx) => (
                              <span
                                key={idx}
                                title={t.description}
                                className="rounded-md border border-border/80 bg-background/90 px-2 py-0.5 font-mono text-[10px] text-foreground"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-w-lg">
                  <h4 className="text-xs font-semibold text-foreground">
                    {mcpDraft.id ? "Edit Server MCP" : "Tambah Server MCP Baru"}
                  </h4>
                  <Input
                    label="Nama Server MCP"
                    placeholder="Contoh: Context7 Remote / GitHub Tools MCP"
                    value={mcpDraft.name || ""}
                    onChange={(val) => setMcpDraft({ ...mcpDraft, name: val })}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Tipe Transport</label>
                    <div className="flex gap-2">
                      {(["sse", "http", "stdio"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setMcpDraft({ ...mcpDraft, transport: t })}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-mono uppercase transition-colors",
                            mcpDraft.transport === t
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border bg-card text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mcpDraft.transport === "stdio" ? (
                    <Input
                      label="Command Stdio"
                      placeholder="npx -y @modelcontextprotocol/server-filesystem /tmp"
                      value={mcpDraft.command || ""}
                      onChange={(val) => setMcpDraft({ ...mcpDraft, command: val })}
                    />
                  ) : (
                    <Input
                      label="Endpoint URL (SSE / HTTP)"
                      placeholder="http://localhost:8787/mcp/context7"
                      value={mcpDraft.url || ""}
                      onChange={(val) => setMcpDraft({ ...mcpDraft, url: val })}
                    />
                  )}

                  {/* Konfigurasi Autentikasi MCP */}
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Autentikasi MCP</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Metode Autentikasi</label>
                      <select
                        value={mcpDraft.authType || "none"}
                        onChange={(e) =>
                          setMcpDraft({
                            ...mcpDraft,
                            authType: e.target.value as "none" | "bearer" | "apiKey" | "customHeader",
                          })
                        }
                        className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none"
                      >
                        <option value="none">Tanpa Autentikasi (Publik)</option>
                        <option value="bearer">Bearer Token (Authorization: Bearer ...)</option>
                        <option value="apiKey">API Key Header (X-API-Key: ...)</option>
                        <option value="customHeader">Custom Header Kustom</option>
                      </select>
                    </div>

                    {mcpDraft.authType && mcpDraft.authType !== "none" ? (
                      <div className="flex flex-col gap-2.5 pt-1">
                        {mcpDraft.authType === "customHeader" ? (
                          <Input
                            label="Nama Header Kustom"
                            placeholder="Contoh: X-MCP-Token"
                            value={mcpDraft.headerName || ""}
                            onChange={(val) => setMcpDraft({ ...mcpDraft, headerName: val })}
                          />
                        ) : null}

                        <Input
                          label="Secret Key / Token"
                          type="password"
                          placeholder="Masukkan token rahasia MCP..."
                          value={mcpDraft.apiKey || ""}
                          onChange={(val) => setMcpDraft({ ...mcpDraft, apiKey: val })}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" onClick={saveMcpDraft}>
                      Simpan Server MCP
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setMcpDraft(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              )
            ) : null}

            {/* 3. KONTEN TAB: AGENT SKILLS (DENGAN DUKUNGAN KUSTOM SKILL) */}
            {activeTab === "skills" ? (
              skillDraft === null ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Daftar Keahlian Agent & Security Gate</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Aktifkan skill bawaan atau buat kustom skill baru dengan instruksi sistem sendiri
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSkillDraft({
                            name: "",
                            description: "",
                            icon: "sparkles",
                            approvalMode: "auto",
                            systemInstruction: "",
                            enabled: true,
                          })
                        }
                        className="text-xs gap-1.5"
                      >
                        <Plus className="size-3.5" /> Tambah Kustom Skill
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSettingsChange({ ...settings, skills: defaultSkills })}
                        className="text-xs gap-1"
                        title="Reset ke skill bawaan"
                      >
                        <RotateCw className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {settings.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className={cn(
                          "flex items-start justify-between gap-4 rounded-xl border p-3.5 transition-colors bg-card/70",
                          skill.enabled ? "border-border" : "border-border/40 opacity-60",
                        )}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            {skillIcon(skill.icon)}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{skill.name}</span>
                              {skill.isCustom ? (
                                <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9.5px] font-semibold text-primary">
                                  Kustom
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.2 text-[9.5px] font-medium uppercase tracking-wider",
                                  skill.approvalMode === "ask"
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                                )}
                              >
                                {skill.approvalMode === "ask" ? "Perlu Izin" : "Otomatis"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {skill.description}
                            </p>
                            {skill.systemInstruction ? (
                              <p className="text-[10px] font-mono text-muted-foreground/80 line-clamp-1">
                                Prompt: {skill.systemInstruction}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <select
                            value={skill.approvalMode}
                            onChange={(e) => toggleSkillApproval(skill.id, e.target.value as "ask" | "auto")}
                            disabled={!skill.enabled}
                            className="h-7 rounded-lg border border-border bg-card px-2 text-[11px] text-foreground outline-none hover:bg-muted disabled:opacity-40"
                          >
                            <option value="ask">Tanya Izin</option>
                            <option value="auto">Auto Approve</option>
                          </select>

                          {skill.isCustom ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSkillDraft({ ...skill })}
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3" />
                            </Button>
                          ) : null}

                          <Switch
                            checked={skill.enabled}
                            onCheckedChange={(val) => toggleSkill(skill.id, val)}
                            ariaLabel={`Toggle ${skill.name}`}
                          />

                          {skill.isCustom ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSkill(skill.id)}
                              className="size-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-w-lg">
                  <h4 className="text-xs font-semibold text-foreground">
                    {skillDraft.id ? "Edit Kustom Skill" : "Tambah Kustom Skill Baru"}
                  </h4>
                  <Input
                    label="Nama Skill"
                    placeholder="Contoh: SQL Query Optimizer / Docker Assistant"
                    value={skillDraft.name || ""}
                    onChange={(val) => setSkillDraft({ ...skillDraft, name: val })}
                  />
                  <Input
                    label="Deskripsi Singkat"
                    placeholder="Deskripsi peran atau tujuan skill ini..."
                    value={skillDraft.description || ""}
                    onChange={(val) => setSkillDraft({ ...skillDraft, description: val })}
                  />

                  {/* Pilihan Ikon */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Pilih Ikon Skill</label>
                    <div className="flex items-center gap-2">
                      {(["sparkles", "terminal", "palette", "file-code", "list-todo", "globe"] as const).map(
                        (ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setSkillDraft({ ...skillDraft, icon: ic })}
                            className={cn(
                              "grid size-8 place-items-center rounded-lg border transition-colors",
                              skillDraft.icon === ic
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                                : "border-border bg-card text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {skillIcon(ic)}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Mode Izin Eksekusi */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Aturan Izin Eksekusi</label>
                    <select
                      value={skillDraft.approvalMode || "auto"}
                      onChange={(e) =>
                        setSkillDraft({
                          ...skillDraft,
                          approvalMode: e.target.value as "ask" | "auto",
                        })
                      }
                      className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none hover:bg-muted"
                    >
                      <option value="auto">Auto Approve (Langsung dieksekusi tanpa konfirmasi)</option>
                      <option value="ask">Tanya Izin (Muncul kartu Security Gate di atas composer)</option>
                    </select>
                  </div>

                  {/* Instruksi Sistem / Prompt */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Instruksi Sistem AI (Prompt Guide)</label>
                    <textarea
                      rows={3}
                      placeholder="Instruksi spesifik yang diberikan kepada model AI saat skill ini aktif..."
                      value={skillDraft.systemInstruction || ""}
                      onChange={(e) => setSkillDraft({ ...skillDraft, systemInstruction: e.target.value })}
                      className="w-full rounded-xl border border-border bg-card p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-foreground/30"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" onClick={saveSkillDraft}>
                      Simpan Kustom Skill
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSkillDraft(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              )
            ) : null}

            {/* 4. KONTEN TAB: MODEL & SYSTEM */}
            {activeTab === "model" ? (
              <div className="flex flex-col gap-5 max-w-xl">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Instruksi Dasar & Parameter Model</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Konfigurasi system prompt harness, kreativitas temperatur, dan streaming respons
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Custom System Prompt</label>
                    <button
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, systemPrompt: defaultSystemPrompt })}
                      className="text-[10.5px] text-primary hover:underline"
                    >
                      Reset Default
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={settings.systemPrompt}
                    onChange={(e) => onSettingsChange({ ...settings, systemPrompt: e.target.value })}
                    className="w-full rounded-xl border border-border bg-card/80 p-3 font-mono text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-foreground/30"
                    placeholder="Instruksi sistem dasar untuk AI harness..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Temperature ({settings.temperature})</label>
                      <span className="text-[10.5px] text-muted-foreground">0.0 (presisi) - 1.0 (kreatif)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.temperature}
                      onChange={(e) => onSettingsChange({ ...settings, temperature: parseFloat(e.target.value) })}
                      className="h-2 w-full cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Reasoning Effort</label>
                    <select
                      value={settings.reasoningEffort}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          reasoningEffort: e.target.value as "low" | "medium" | "high",
                        })
                      }
                      className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-foreground outline-none hover:bg-muted"
                    >
                      <option value="low">Rendah (Cepat)</option>
                      <option value="medium">Sedang (Seimbang)</option>
                      <option value="high">Tinggi (Mendalam / R1)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-card/70">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Streaming Respons (SSE)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Menampilkan token kata demi kata secara real-time saat model merespons
                    </span>
                  </div>
                  <Switch
                    checked={settings.streaming}
                    onCheckedChange={(val) => onSettingsChange({ ...settings, streaming: val })}
                    ariaLabel="Toggle Streaming"
                  />
                </div>
              </div>
            ) : null}

            {/* 5. KONTEN TAB: TAMPILAN & DATA */}
            {activeTab === "appearance" ? (
              <div className="flex flex-col gap-5 max-w-xl">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Preferensi Antarmuka & Tampilan</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Atur tema visual dan format tampilan blok kode di transkrip
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Pilihan Tema</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["dark", "light", "system"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onSettingsChange({ ...settings, theme: t });
                          if (t === "dark") document.documentElement.classList.add("dark");
                          else if (t === "light") document.documentElement.classList.remove("dark");
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium capitalize transition-colors",
                          settings.theme === t
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-card text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {t === "dark" ? "🌙 Gelap" : t === "light" ? "☀️ Terang" : "💻 Sistem"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-card/70">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Nomor Baris Kode</span>
                    <span className="text-[11px] text-muted-foreground">
                      Tampilkan penomoran baris pada blok kode Shiki
                    </span>
                  </div>
                  <Switch
                    checked={settings.showLineNumbers}
                    onCheckedChange={(val) => onSettingsChange({ ...settings, showLineNumbers: val })}
                    ariaLabel="Toggle Line Numbers"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-card/70">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Bungkus Teks Kode (Word Wrap)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Bungkus baris kode yang panjang tanpa scroll horizontal
                    </span>
                  </div>
                  <Switch
                    checked={settings.wrapCode}
                    onCheckedChange={(val) => onSettingsChange({ ...settings, wrapCode: val })}
                    ariaLabel="Toggle Word Wrap"
                  />
                </div>

                <div className="pt-3 border-t border-border/80">
                  <Button variant="ghost" size="sm" onClick={resetAllSettings} className="text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="size-3.5 mr-1.5" /> Reset Seluruh Pengaturan
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </MorphingModal>
  );
}

function safeHostName(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "API Baru";
  }
}
