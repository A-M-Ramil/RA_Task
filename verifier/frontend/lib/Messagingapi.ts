const API_BASE = process.env.NEXT_PUBLIC_VERIFIER_API_URL || "http://localhost:8001";

export type Role = "student" | "faculty";

export interface ChatMessage {
  direction: "in" | "out";
  content: string;
  at: string;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const messagingApi = {
  myConnection: (role: Role, ownerId: string) =>
    api<{
      connection_id: string | null;
      invitation_url?: string;
      state?: string;
      connected?: boolean;
    }>(`/messaging/my-connection?role=${role}&owner_id=${encodeURIComponent(ownerId)}`),

  createInvitation: (role: Role, ownerId: string, label?: string) =>
    api<{ connection_id: string; invitation_url: string }>(`/messaging/create-invitation`, {
      method: "POST",
      body: JSON.stringify({ role, owner_id: ownerId, label }),
    }),

  checkConnection: (connectionId: string) =>
    api<{ state: string; connected: boolean }>(`/messaging/check-connection/${connectionId}`),

  history: (connectionId: string) =>
    api<{ messages: ChatMessage[] }>(`/messaging/history/${connectionId}`),

  send: (connectionId: string, content: string) =>
    api<{ status: string }>(`/messaging/send`, {
      method: "POST",
      body: JSON.stringify({ connection_id: connectionId, content }),
    }),
    disconnect: (connectionId: string) =>
  api<{ status: string }>(`/messaging/connection/${connectionId}`, { method: "DELETE" }),
};