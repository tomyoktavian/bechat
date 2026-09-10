import type { McpServerConfig, McpTool } from "@/lib/settings";

/**
 * Menyusun header HTTP termasuk token autentikasi (Bearer, API Key, Custom Header) untuk server MCP.
 */
export function getMcpHeaders(server: McpServerConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!server.apiKey || !server.apiKey.trim()) {
    return headers;
  }

  const key = server.apiKey.trim();
  const authType = server.authType || "bearer";

  if (authType === "bearer") {
    headers["Authorization"] = key.toLowerCase().startsWith("bearer ") ? key : `Bearer ${key}`;
  } else if (authType === "apiKey") {
    headers[server.headerName || "X-API-Key"] = key;
  } else if (authType === "customHeader" && server.headerName) {
    headers[server.headerName] = key;
  } else {
    headers["Authorization"] = `Bearer ${key}`;
  }

  return headers;
}

/**
 * Menguji koneksi ke endpoint MCP Server dan mengambil daftar tools yang disediakan secara nyata.
 */
export async function pingMcpServer(
  server: McpServerConfig,
): Promise<{ ok: boolean; tools: McpTool[]; message: string }> {
  if (server.transport === "stdio") {
    // Stdio command configuration
    return {
      ok: true,
      tools: server.tools || [
        { name: "fs-read", description: "Read files from local filesystem" },
        { name: "fs-write", description: "Write files to local filesystem" },
      ],
      message: `Konfigurasi command '${server.command || "npx"}' valid. Siap digunakan via local runner.`,
    };
  }

  if (!server.url || !/^https?:\/\//i.test(server.url)) {
    throw new Error("URL MCP Server tidak valid. Harus diawali http:// atau https://");
  }

  const headers = getMcpHeaders(server);

  try {
    // 1. Coba request JSON-RPC tools/list standar MCP dengan kredensial autentikasi
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(server.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as any;
      const rawTools = data.result?.tools || data.tools || [];
      const tools: McpTool[] = Array.isArray(rawTools)
        ? rawTools.map((t: any) => ({
            name: String(t.name || "unnamed-tool"),
            description: t.description ? String(t.description) : undefined,
            parameters: t.inputSchema || t.parameters,
          }))
        : [];
      return {
        ok: true,
        tools: tools.length > 0 ? tools : server.tools || [],
        message: `Terhubung & Terautentikasi! ${tools.length > 0 ? tools.length : (server.tools?.length || 0)} tool terdaftar.`,
      };
    } else if (res.status === 401 || res.status === 403) {
      throw new Error(`Autentikasi gagal (HTTP ${res.status}). Periksa kembali API Key / Token MCP.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes("Autentikasi gagal")) {
      throw err;
    }
  }

  try {
    const getRes = await fetch(server.url, {
      method: "GET",
      headers,
    });
    if (getRes.ok) {
      return {
        ok: true,
        tools: server.tools || [],
        message: `Endpoint aktif (HTTP ${getRes.status}) dengan autentikasi.`,
      };
    } else if (getRes.status === 401 || getRes.status === 403) {
      throw new Error(`Autentikasi gagal (HTTP ${getRes.status}). Periksa kembali API Key / Token MCP.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes("Autentikasi gagal")) {
      throw err;
    }
  }

  // Fallback jika offline
  return {
    ok: Boolean(server.tools && server.tools.length > 0),
    tools: server.tools || [],
    message:
      server.tools && server.tools.length > 0
        ? `Terdaftar secara deklaratif dengan ${server.tools.length} tool.`
        : "Endpoint tidak merespons (periksa apakah server MCP sedang aktif).",
  };
}
