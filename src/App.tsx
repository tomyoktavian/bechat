import {
  Bot,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Server,
  Settings2,
  Sparkles,
  Trash2,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
  MessageScroller,
} from "@/components/agents/message";
import { PromptInput, type PromptAction } from "@/components/agents/prompt-input";
import { AISidebar, type SidebarResource } from "@/components/agents/ai-sidebar";
import { ReasoningText } from "@/components/agents/loading-states";
import { HarnessMessageView } from "@/components/agents/harness-message-view";
import { FloatingTodoList } from "@/components/agents/floating-todo-list";
import { AttachedApproval } from "@/components/agents/attached-approval";
import { Button } from "@/components/motion/button";
import { SettingsModal } from "@/components/settings-modal";
import { activeProfile } from "@/lib/settings";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useChatStore } from "@/stores/chat-store";
import { useSettingsStore } from "@/stores/settings-store";

export default function App() {
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings Store (Persist via IndexedDB)
  const settings = useSettingsStore();
  const profile = activeProfile(settings);

  // Chat Store (Persist via IndexedDB)
  const {
    sessions,
    activeSessionId,
    streamingId,
    models,
    modelsState,
    modelsError,
    selectedModel,
    createNewSession,
    deleteSession,
    renameSession,
    setActiveSessionId,
    loadModels,
    selectModel,
    sendMessage,
    stopStreaming,
    retryMessage,
    handleToolApproval,
    handleApprovalCard,
  } = useChatStore();

  // Responsive Sidebar state (Desktop: default open, Mobile: default closed)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const currentSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = currentSession?.messages || [];

  // Muat model saat profil API berubah
  useEffect(() => {
    if (profile) {
      void loadModels(profile);
    }
  }, [profile?.id, profile?.baseUrl, profile?.apiKey, loadModels]);

  // Todo list aktif dari sesi ini
  const activeTodos =
    [...messages].reverse().find((m) => m.todos && m.todos.length > 0)?.todos || [];

  // Pesan terakhir yang membutuhkan approval aktif
  const pendingApprovalMessage = [...messages].reverse().find(
    (m) =>
      (m.toolApproval && m.toolApproval.status === "pending") ||
      (m.approvalCard && m.approvalCard.status === "pending"),
  );

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!profile) {
      setSettingsOpen(true);
      return;
    }
    sendMessage(trimmed, profile);
  };

  const handleAction = (actionValue: string) => {
    if (actionValue.startsWith("skill-")) {
      const skillId = actionValue.replace("skill-", "");
      const matchedSkill = settings.skills.find((s) => s.id === skillId);
      if (matchedSkill) {
        handleSend(
          `[Gunakan Keahlian: ${matchedSkill.name}]\n${matchedSkill.description}\n\nInstruksi untuk AI: ${matchedSkill.systemInstruction || "Terapkan keahlian ini secara maksimal."}`,
        );
      }
    }
  };

  // Konversi sessions ke SidebarResource untuk AISidebar
  const sidebarItems: SidebarResource[] = sessions.map((s) => ({
    id: s.id,
    label: s.title,
    kind: "file",
  }));

  // Actions dinamis dari skills aktif (termasuk kustom skills)
  const composerActions: PromptAction[] = settings.skills
    .filter((s) => s.enabled)
    .map((s) => ({
      value: `skill-${s.id}`,
      label: `⚡ ${s.name}`,
      description: s.description,
      icon: <Sparkles />,
    }));

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: m.id,
    icon: <Cpu />,
  }));

  // Helper render isi sidebar agar konsisten di Desktop & Mobile Drawer
  const renderSidebarContent = (isMobileDrawer = false) => (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-xs font-semibold tracking-tight text-foreground">
            beChat Workspace
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tutup Sidebar"
          onClick={() => setSidebarOpen(false)}
          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
        >
          {isMobileDrawer ? <X className="size-4" /> : <PanelLeftClose className="size-3.5" />}
        </Button>
      </div>

      <div className="p-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            createNewSession();
            if (isMobileDrawer) setSidebarOpen(false);
          }}
          className="w-full justify-start gap-2 rounded-xl text-xs font-medium"
        >
          <Plus className="size-3.5" /> Chat Baru
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        <AISidebar
          items={sidebarItems}
          activeId={currentSession?.id}
          onActiveChange={(id) => {
            setActiveSessionId(id);
            if (isMobileDrawer) setSidebarOpen(false);
          }}
          onRename={(item, newLabel) => renameSession(item.id, newLabel)}
          renderMenu={(item, controls) => (
            <div className="flex flex-col gap-0.5 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  controls.rename();
                  controls.close();
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-muted text-left"
              >
                Ganti Nama
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSession(item.id);
                  controls.close();
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-destructive hover:bg-destructive/10 text-left"
              >
                <Trash2 className="size-3" /> Hapus
              </button>
            </div>
          )}
          className="w-full"
        />
      </div>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(true);
            if (isMobileDrawer) setSidebarOpen(false);
          }}
          className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/80 px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Server className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium text-foreground">
              {profile ? profile.name : "Konfigurasi API"}
            </span>
          </div>
          <Settings2 className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* 1. Desktop Docked Sidebar */}
      {sidebarOpen ? (
        <aside className="hidden md:flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur">
          {renderSidebarContent(false)}
        </aside>
      ) : null}

      {/* 2. Mobile Slide-over Drawer dengan Backdrop */}
      <AnimatePresence>
        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      {/* 3. Main Chat Area */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <header className="glass z-30 flex items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-6 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen && !isMobile ? "Tutup Sidebar" : "Buka Sidebar"}
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="size-8 rounded-lg shrink-0"
            >
              {sidebarOpen && !isMobile ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>

            <div className="min-w-0">
              <h1 className="truncate text-xs sm:text-sm font-semibold tracking-tight text-foreground">
                {currentSession?.title || "beChat"}
              </h1>
              <p className="flex items-center gap-1.5 truncate text-[10.5px] sm:text-[11px] text-muted-foreground">
                <Server className="size-3 shrink-0" />
                {profile ? (
                  <>
                    <span className="truncate">{profile.name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">
                      {modelsState === "loading"
                        ? "memuat model…"
                        : modelsState === "ready"
                          ? `${models.length} model`
                          : modelsState === "error"
                            ? "gagal muat model"
                            : "belum ada model"}
                    </span>
                  </>
                ) : (
                  "belum ada API"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              aria-label="Buka pengaturan Workspace, MCP, dan Skills"
              className="h-8 px-2 sm:px-3 text-xs gap-1.5"
            >
              <Settings2 className="size-3.5" />
              <span className="hidden sm:inline">Pengaturan</span>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9.5px] font-semibold text-primary">
                {settings.mcpServers.filter((s) => s.enabled).length} MCP
              </span>
            </Button>
          </div>
        </header>

        {/* Floating Todo List di Pojok Kanan Atas Container Chat */}
        {activeTodos.length > 0 ? (
          <div className="absolute top-13 right-3 sm:top-14 sm:right-5 z-40 max-w-[calc(100vw-1.5rem)]">
            <FloatingTodoList items={activeTodos} defaultMinimized={isMobile} />
          </div>
        ) : null}

        {/* Transkrip Chat MessageScroller */}
        <MessageScroller
          className="min-h-0 flex-1"
          viewportClassName="h-full"
          contentClassName="mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6 px-3 pt-4 pb-48 sm:px-6 sm:pt-6 sm:pb-56"
          busy={streamingId !== null}
          label="Transkrip percakapan"
        >
          {messages.length === 0 ? (
            <EmptyState
              hasProfile={Boolean(profile)}
              modelsState={modelsState}
              modelsError={modelsError}
              modelSelected={Boolean(selectedModel)}
              onOpenSettings={() => setSettingsOpen(true)}
              onRetryModels={profile ? () => loadModels(profile) : undefined}
              onSelectPrompt={(text) => handleSend(text)}
            />
          ) : (
            messages.map((message) =>
              message.role === "user" ? (
                <Message key={message.id} from="user" animateIn>
                  <MessageContent>
                    <MessageBubble variant="tint" animateIn>
                      <MessageBubbleContent>
                        {message.content}
                      </MessageBubbleContent>
                    </MessageBubble>
                  </MessageContent>
                  <MessageAvatar>
                    <User className="size-3.5" />
                  </MessageAvatar>
                </Message>
              ) : (
                <Message key={message.id} from="assistant" animateIn>
                  <MessageAvatar>
                    <Bot className="size-3.5" />
                  </MessageAvatar>
                  <MessageContent className="w-full">
                    <HarnessMessageView
                      message={message}
                      isStreaming={streamingId === message.id}
                      onRetry={() => retryMessage(message.id, profile)}
                    />
                    {streamingId === message.id && !message.content && !message.reasoning ? (
                      <div className="py-2">
                        <ReasoningText
                          phrases={[
                            "Memproses instruksi pengguna…",
                            "Menganalisis permintaan kode…",
                            "Menyiapkan respons streaming…",
                          ]}
                          interval={1500}
                          variant="cascade"
                          className="text-xs text-muted-foreground"
                        />
                      </div>
                    ) : null}
                    {message.error ? (
                      <div className="mt-2 flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                        <div className="flex items-center gap-2 font-medium">
                          <TriangleAlert className="size-4 shrink-0" />
                          <span>Gagal mendapatkan respons:</span>
                        </div>
                        <p className="font-mono text-[11px] leading-relaxed opacity-90">
                          {message.error}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSettingsOpen(true)}
                            className="h-7 text-xs"
                          >
                            <Settings2 className="size-3" /> Periksa API Key / URL
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryMessage(message.id, profile)}
                            className="h-7 text-xs"
                          >
                            <RotateCcw className="size-3" /> Coba Lagi
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </MessageContent>
                </Message>
              ),
            )
          )}
        </MessageScroller>

        {/* Floating Chat Compose Dock & Attached Approval Card (Centered to Chat Container) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-4 z-30 flex justify-center px-2.5 sm:px-4">
          <div className="pointer-events-auto flex w-full max-w-3xl flex-col">
            {/* Approval Card menempel di atas chat composer */}
            {pendingApprovalMessage ? (
              <AttachedApproval
                toolApproval={pendingApprovalMessage.toolApproval}
                approvalCard={pendingApprovalMessage.approvalCard}
                onToolApprovalChange={(status) =>
                  handleToolApproval(pendingApprovalMessage.id, status)
                }
                onApprovalCardChange={(status) =>
                  handleApprovalCard(pendingApprovalMessage.id, status)
                }
              />
            ) : null}

            {/* Floating Composer Container dengan glassmorphism */}
            <div className="w-full rounded-2xl border border-border/80 bg-card/90 p-1.5 sm:p-2 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all">
              {profile && modelsState === "error" ? (
                <p className="mb-2 flex items-center gap-1.5 px-2 text-xs text-destructive">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  {modelsError}
                </p>
              ) : null}
              <PromptInput
                models={modelOptions}
                model={selectedModel || undefined}
                onModelChange={(m) => selectModel(m, profile?.id)}
                onReloadModels={profile ? () => loadModels(profile) : undefined}
                modelsLoading={modelsState === "loading"}
                actions={composerActions}
                onAction={handleAction}
                onSubmit={(text) => handleSend(text)}
                loading={streamingId !== null}
                onStop={stopStreaming}
                placeholder={
                  profile
                    ? "Tulis instruksi atau pilih aksi… (Enter kirim, Shift+Enter baris baru)"
                    : "Tambahkan API terlebih dahulu untuk mulai mengobrol"
                }
                disabled={!profile}
                aria-label="Pesan"
              />
              <p className="mt-1.5 flex items-center justify-between px-2 text-[10px] sm:text-[11px] text-muted-foreground">
                <span className="truncate max-w-[65%]">
                  {profile
                    ? `${profile.name} · ${selectedModel || "pilih model"}`
                    : "Dukungan format kompatibel OpenAI"}
                </span>
                <span className="shrink-0">
                  Pintasan: klik <span className="font-semibold">+</span> untuk skills
                </span>
              </p>
            </div>
          </div>
        </div>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </div>
  );
}

function EmptyState({
  hasProfile,
  modelsState,
  modelsError,
  modelSelected,
  onOpenSettings,
  onRetryModels,
  onSelectPrompt,
}: {
  hasProfile: boolean;
  modelsState: "idle" | "loading" | "ready" | "error";
  modelsError: string;
  modelSelected: boolean;
  onOpenSettings: () => void;
  onRetryModels: (() => void) | undefined;
  onSelectPrompt: (prompt: string) => void;
}) {
  const suggestions = [
    {
      title: "🎨 Buatkan Logo SVG",
      prompt: "Buatkan kode SVG logo panah modern yang elegan dengan gradien warna biru-violet dan bayangan.",
    },
    {
      title: "💻 Komponen React & Motion",
      prompt: "Tulis komponen React kartu interaktif dengan animasi hover tilt dan spring menggunakan Motion.",
    },
    {
      title: "📝 Review & File Diff",
      prompt: "Tampilkan analisis perbaikan kode bug memory leak pada React useEffect dalam format git diff.",
    },
    {
      title: "📋 Rencana Kerja Agent",
      prompt: "Buatkan rencana kerja bertahap (todo list) untuk optimasi kecepatan load website Vite React.",
    },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:gap-5 py-6 sm:py-8 text-center px-2">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary shadow-xs">
        <Sparkles className="size-5" />
      </span>

      <div className="max-w-md space-y-1">
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
          {!hasProfile
            ? "Hubungkan API AI Anda"
            : modelsState === "loading"
              ? "Memuat daftar model…"
              : modelsState === "error"
                ? "Daftar model gagal dimuat"
                : modelSelected
                  ? "Apa yang ingin Anda selesaikan hari ini?"
                  : "Pilih model di combobox composer"}
        </h2>
        <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground">
          {!hasProfile
            ? "Tambahkan endpoint dan API key kompatibel OpenAI (OpenAI, OpenRouter, Ollama, Groq, 9router)."
            : modelsState === "error"
              ? modelsError
              : "Ketik instruksi di composer bawah atau klik salah satu inspirasi prompt berikut:"}
        </p>
      </div>

      {!hasProfile ? (
        <Button onClick={onOpenSettings} size="sm">
          <Settings2 className="size-4" /> Buka Pengaturan API
        </Button>
      ) : modelsState === "error" && onRetryModels ? (
        <Button variant="outline" size="sm" onClick={onRetryModels}>
          <RotateCcw className="size-3.5" /> Coba muat ulang model
        </Button>
      ) : (
        <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2 text-left pt-2">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(s.prompt)}
              className="flex flex-col gap-1 rounded-xl border border-border/80 bg-card/60 p-2.5 sm:p-3 text-xs transition-all hover:border-border-strong hover:bg-muted/50 hover:shadow-xs active:scale-[0.99]"
            >
              <span className="font-semibold text-foreground text-xs">{s.title}</span>
              <span className="line-clamp-2 text-[10.5px] sm:text-[11px] text-muted-foreground leading-relaxed">
                {s.prompt}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
