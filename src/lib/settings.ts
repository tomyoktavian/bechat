export interface ApiProfile {
  id: string;
  name: string;
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1 */
  baseUrl: string;
  apiKey: string;
}

export interface McpTool {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: "sse" | "http" | "stdio";
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status?: "online" | "offline" | "connecting" | "error";
  tools?: McpTool[];
  error?: string;
  // Dukungan Autentikasi MCP
  authType?: "none" | "bearer" | "apiKey" | "customHeader";
  apiKey?: string;
  headerName?: string;
}

export interface AgentSkillConfig {
  id: string;
  name: string;
  description: string;
  icon: "terminal" | "palette" | "file-code" | "list-todo" | "sparkles" | "globe";
  enabled: boolean;
  approvalMode: "ask" | "auto";
  systemInstruction: string;
  isCustom?: boolean;
}

export interface AppSettings {
  profiles: ApiProfile[];
  activeProfileId: string | null;
  /** Last chosen model per profile id. */
  selectedModel: Record<string, string>;
  // MCP & Skills Settings
  mcpServers: McpServerConfig[];
  skills: AgentSkillConfig[];
  // Model & System Prompt Parameters
  systemPrompt: string;
  temperature: number;
  maxTokens?: number;
  streaming: boolean;
  reasoningEffort: "low" | "medium" | "high";
  // Tampilan & Tipe
  theme: "dark" | "light" | "system";
  showLineNumbers: boolean;
  wrapCode: boolean;
}

const STORAGE_KEY = "bechat.settings.v1";

export const defaultSkills: AgentSkillConfig[] = [
  {
    id: "terminal",
    name: "Terminal Runner (Bash / CLI)",
    description: "Eksekusi perintah terminal untuk build, test, dan instalasi paket.",
    icon: "terminal",
    enabled: true,
    approvalMode: "ask",
    systemInstruction:
      "Jika perlu menjalankan perintah terminal, gunakan blok tool execution dengan format perintah shell yang aman.",
  },
  {
    id: "svg_preview",
    name: "Code & SVG Visual Artifact Preview",
    description: "Merender kode SVG dan komponen web secara visual langsung di antarmuka obrolan.",
    icon: "palette",
    enabled: true,
    approvalMode: "auto",
    systemInstruction:
      "Saat menghasilkan logo atau grafis SVG, sertakan blok kode ```xml atau ```svg lengkap dengan atribut viewBox agar dapat dirender secara visual.",
  },
  {
    id: "file_diff",
    name: "Git File Diff & Patch Review",
    description: "Review perbedaan baris berkas kode (penambahan + dan penghapusan -).",
    icon: "file-code",
    enabled: true,
    approvalMode: "ask",
    systemInstruction:
      "Gunakan format blok ```diff untuk perubahan kode sehingga ditampilkan dengan kartu FileDiff visual.",
  },
  {
    id: "todo_planner",
    name: "Task Planning & Todo List",
    description: "Membuat daftar rencana kerja agent yang tampil melayang di pojok kanan atas.",
    icon: "list-todo",
    enabled: true,
    approvalMode: "auto",
    systemInstruction:
      "Uraikan langkah-langkah tugas menjadi checklist terstruktur jika instruksi pengguna membutuhkan multi-step workflow.",
  },
  {
    id: "reasoning_trace",
    name: "Deep Reasoning & Thinking Process",
    description: "Menampilkan proses berpikir dan reasoning trace model secara real-time.",
    icon: "sparkles",
    enabled: true,
    approvalMode: "auto",
    systemInstruction:
      "Sertakan blok <think>...</think> untuk memaparkan proses pertimbangan dan analisis sebelum memberikan jawaban akhir.",
  },
  {
    id: "web_research",
    name: "Web Research & Citations",
    description: "Menyertakan referensi sumber dokumen dan tautan kutipan web dengan auto-domain.",
    icon: "globe",
    enabled: true,
    approvalMode: "auto",
    systemInstruction:
      "Sertakan referensi tautan sumber dalam format markdown atau kutipan URL jika menyitir dokumentasi.",
  },
];

export const defaultMcpServers: McpServerConfig[] = [
  {
    id: "mcp-context7",
    name: "Context7 Documentation MCP",
    transport: "sse",
    url: "http://localhost:8787/mcp/context7",
    enabled: true,
    status: "online",
    tools: [
      {
        name: "resolve-library-id",
        description: "Mencari ID pustaka dokumentasi resmi untuk Context7.",
      },
      {
        name: "query-docs",
        description: "Mengambil dokumentasi terupdate dan contoh kode pustaka.",
      },
    ],
  },
  {
    id: "mcp-fetch",
    name: "Web Fetch & Extractor MCP",
    transport: "http",
    url: "http://localhost:8787/mcp/fetch",
    enabled: true,
    status: "online",
    tools: [
      {
        name: "fetch-webpage",
        description: "Mengambil konten halaman web publik dan mengonversinya ke markdown.",
      },
    ],
  },
];

export const defaultSystemPrompt =
  "Anda adalah ZCode beChat — AI coding assistant yang cerdas, cepat, dan presisi. Anda memiliki akses ke berbagai keahlian seperti live SVG code rendering, file diff review, dan task planning. Berikan jawaban yang terstruktur dengan format Markdown yang jelas.";

export const emptySettings: AppSettings = {
  profiles: [],
  activeProfileId: null,
  selectedModel: {},
  mcpServers: defaultMcpServers,
  skills: defaultSkills,
  systemPrompt: defaultSystemPrompt,
  temperature: 0.7,
  streaming: true,
  reasoningEffort: "medium",
  theme: "dark",
  showLineNumbers: true,
  wrapCode: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySettings;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      activeProfileId: parsed.activeProfileId ?? null,
      selectedModel: parsed.selectedModel ?? {},
      mcpServers: Array.isArray(parsed.mcpServers) ? parsed.mcpServers : defaultMcpServers,
      skills: Array.isArray(parsed.skills) ? parsed.skills : defaultSkills,
      systemPrompt: parsed.systemPrompt ?? defaultSystemPrompt,
      temperature: typeof parsed.temperature === "number" ? parsed.temperature : 0.7,
      maxTokens: parsed.maxTokens,
      streaming: parsed.streaming ?? true,
      reasoningEffort: parsed.reasoningEffort ?? "medium",
      theme: parsed.theme ?? "dark",
      showLineNumbers: parsed.showLineNumbers ?? true,
      wrapCode: parsed.wrapCode ?? false,
    };
  } catch {
    return emptySettings;
  }
}

export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function createId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function activeProfile(settings: AppSettings): ApiProfile | null {
  return (
    settings.profiles.find((p) => p.id === settings.activeProfileId) ??
    settings.profiles[0] ??
    null
  );
}
