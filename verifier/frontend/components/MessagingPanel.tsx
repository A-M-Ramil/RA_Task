"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Send, LogOut, MessageSquareDashed, Loader2, QrCode } from "lucide-react";
import { messagingApi, ChatMessage, Role } from "@/lib/Messagingapi";

type Stage = "loading" | "connect" | "waiting" | "chat";

export default function MessagingPanel({
  role,
  ownerId,
  ownerLabel,
}: {
  role: Role;
  ownerId: string;
  ownerLabel: string;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" , });
  };

  // Trigger scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    messagingApi.myConnection(role, ownerId).then((res) => {
      if (!res.connection_id) {
        setStage("connect");
        return;
      }
      setConnectionId(res.connection_id);
      if (res.connected) {
        setStage("chat");
      } else {
        setInvitationUrl(res.invitation_url ?? null);
        setStage("waiting");
      }
    });
  }, [role, ownerId]);

  const startConnection = useCallback(async () => {
    const res = await messagingApi.createInvitation(role, ownerId, ownerLabel);
    setConnectionId(res.connection_id);
    setInvitationUrl(res.invitation_url);
    setStage("waiting");
  }, [role, ownerId, ownerLabel]);

  useEffect(() => {
    if (stage !== "waiting" || !connectionId) return;
    const id = setInterval(async () => {
      const res = await messagingApi.checkConnection(connectionId);
      if (res.connected) {
        clearInterval(id);
        setStage("chat");
      }
    }, 2000);
    return () => clearInterval(id);
  }, [stage, connectionId]);

  useEffect(() => {
    if (stage !== "chat" || !connectionId) return;
    const id = setInterval(async () => {
      const res = await messagingApi.history(connectionId);
      setMessages(res.messages);
    }, 2000);
    return () => clearInterval(id);
  }, [stage, connectionId]);

  const endConnection = useCallback(async () => {
    if (!connectionId) return;
    // Assuming you added disconnect() to your Messagingapi.ts!
    await messagingApi.disconnect(connectionId); 
    setConnectionId(null);
    setInvitationUrl(null);
    setMessages([]);
    setStage("connect");
  }, [connectionId]);

  const sendMessage = useCallback(async () => {
    if (!connectionId || !draft.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await messagingApi.send(connectionId, draft.trim());
      setDraft("");
      const res = await messagingApi.history(connectionId);
      setMessages(res.messages);
    } finally {
      setIsSending(false);
    }
  }, [connectionId, draft, isSending]);

  // ---------------------------------------------------------
  // UI RENDERERS
  // ---------------------------------------------------------

  if (stage === "loading") {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm font-medium text-slate-500">Restoring connection…</p>
      </div>
    );
  }

  if (stage === "connect") {
    return (
      <div className="flex bg-[#181818]/50 h-[480px] flex-col items-center justify-center rounded-xl border border-gray-900 p-8 text-center shadow-sm">
        <div className="mb-6 rounded-full bg-indigo-50 p-4">
          <MessageSquareDashed className="h-8 w-8 text-indigo-900" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">Secure Messaging</h3>
        <p className="mb-8 max-w-sm text-sm text-slate-300">
          Establish an encrypted, peer-to-peer connection with the Verifier to start chatting.
        </p>
        <button
          onClick={startConnection}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Generate Connection QR
        </button>
      </div>
    );
  }

  if (stage === "waiting") {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-[#181818]/50 p-8 text-center shadow-sm">
        <div className="mb-4 flex items-center justify-center gap-2 text-white">
          <QrCode className="h-5 w-5" />
          <h3 className="font-semibold">Scan to Connect</h3>
        </div>
        {invitationUrl && (
          <div className="mx-auto mb-6 w-fit rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <QRCodeSVG value={invitationUrl} size={200} />
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for BC Wallet...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[480px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#121212] shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-black/40 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
          <span className="text-sm font-medium text-slate-200">Live Connection</span>
        </div>
        <button
          onClick={endConnection}
          className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-red-950/40 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Disconnect
        </button>
      </div>

      {/* Chat Area */}
      {/* Chat Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5 
        [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.700)_transparent] 
        [&::-webkit-scrollbar]:w-1.5 
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:rounded-full 
        [&::-webkit-scrollbar-thumb]:bg-slate-700 
        hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <MessageSquareDashed className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">Send one below or from your BC Wallet.</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                m.direction === "out" 
                  ? "rounded-tr-sm bg-indigo-600 text-white" 
                  : "rounded-tl-sm border border-slate-700 bg-slate-800/80 text-slate-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {/* Invisible div to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 bg-black/20 p-3">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a secure message..."
            disabled={isSending}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-200 transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim() || isSending}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 p-2.5 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}