"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, QrCode, CheckCircle2, LockKeyhole, Loader2, Trash2, ScanFace, Unlock } from "lucide-react";

// Updated to match your Verifier FastAPI backend port
const API_BASE_URL = "http://127.0.0.1:8001";

export default function VerifierPortal() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Connection States
  const [connectionId, setConnectionId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  // --- 1. GENERATE LOGIN QR CODE ---
  const generateQR = async () => {
    setLoading(true);
    addLog("⏳ Generating secure login sequence...");
    try {
      const res = await fetch(`${API_BASE_URL}/protocol2/connect-verifier`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok) {
        setConnectionId(data.connection_id);
        setInviteUrl(data.invitation_url);
        setIsConnected(false);
        addLog(`✅ Secure channel created! (ID: ${data.connection_id.slice(0, 8)}...)`);
        addLog("👀 Awaiting biometric or wallet authentication...");
        
        pollConnectionStatus(data.connection_id);
      } else {
        addLog(`❌ Error: ${data.detail}`);
      }
    } catch (err) {
      addLog(`❌ Network Error: ${err}`);
    }
    setLoading(false);
  };

  // --- 2. SILENT POLLING ---
  const pollConnectionStatus = async (cId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/protocol2/check-connection/${cId}`);
      const data = await res.json();

      if (res.ok && data.connected) {
        setIsConnected(true);
        addLog(`✅ Wallet Handshake Complete!`);
        if (pollingRef.current) clearTimeout(pollingRef.current);
        return; 
      }
    } catch (err) {
      console.error("Polling error:", err);
    }

    pollingRef.current = setTimeout(() => pollConnectionStatus(cId), 3000);
  };

  // --- 3. SILENT POLLING FOR PROOF ---
  const pollProofStatus = async (presExId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/protocol2/check-proof/${presExId}`);
      const data = await res.json();

      if (res.ok && data.verified) {
        addLog(`🔓 Zero-Knowledge Proof Verified!`);
        addLog(`✅ Access Granted. Redirecting to dashboard...`);
        if (pollingRef.current) clearTimeout(pollingRef.current);
        
        // Save the verified data to the browser's session storage
        sessionStorage.setItem("bracu_user", JSON.stringify(data.user_data));
        
        // Redirect to the dashboard
        setTimeout(() => router.push("/dashboard"), 1500);
        return; 
      }
    } catch (err) {
      console.error("Proof polling error:", err);
    }

    // Keep checking every 2 seconds
    pollingRef.current = setTimeout(() => pollProofStatus(presExId), 2000);
  };

  // --- 4. REQUEST PROOF (VERIFICATION) ---
  const requestProof = async () => {
    setLoading(true);
    try {
      addLog(`🚀 Requesting cryptographic proof of BRACU enrollment...`);
      const res = await fetch(`${API_BASE_URL}/protocol2/request-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        addLog(`⏳ Proof request dispatched. Please approve on your device.`);
        pollProofStatus(data.presentation_exchange_id); 
      } else {
        addLog(`❌ Backend Error: ${JSON.stringify(data.detail)}`);
      }
    } catch (err) {
      addLog(`❌ Network Error: ${err}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans selection:bg-violet-500/30">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]"></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4 pt-8 pb-4">
          <div className="bg-zinc-900 p-4 rounded-full border border-zinc-800 shadow-lg shadow-violet-900/20">
            <LockKeyhole className="h-10 w-10 text-violet-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">BRACU Student Login</h1>
            <p className="text-zinc-400 mt-2 font-medium tracking-wide">Zero-Trust Lab Access & SSO Portal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COLUMN: Verification Flow */}
          <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-xl shadow-2xl overflow-hidden relative">
            <CardHeader className="border-b border-zinc-800/50 pb-6">
              <CardTitle className="text-xl text-zinc-100 flex items-center gap-2">
                <ScanFace className="h-5 w-5 text-violet-400" />
                Identity Authentication
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Authenticate securely using your decentralized wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[320px] p-8">
              
              {!inviteUrl && (
                <Button 
                  onClick={generateQR} 
                  disabled={loading} 
                  size="lg"
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all duration-300 font-semibold h-14 text-lg"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
                  Generate Login QR
                </Button>
              )}

              {inviteUrl && !isConnected && (
                <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="bg-white p-4 rounded-2xl shadow-[0_0_50px_rgba(124,58,237,0.15)] relative">
                    {/* Scanner animation line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-violet-500/50 shadow-[0_0_15px_rgba(124,58,237,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}`} 
                      alt="Scan to login" 
                      className="rounded-lg relative z-10"
                    />
                  </div>
                  <div className="flex items-center space-x-3 text-violet-300 bg-violet-950/40 px-5 py-2.5 rounded-full border border-violet-900/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium tracking-wide">Awaiting Wallet Connection...</span>
                  </div>
                </div>
              )}

              {isConnected && (
                <div className="w-full space-y-8 animate-in slide-in-from-right-8 duration-500">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-100">Wallet Connected</h3>
                      <p className="text-sm text-zinc-400 mt-1">Ready to verify your cryptographic credentials.</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={requestProof} 
                    disabled={loading} 
                    size="lg"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all duration-300 h-14 text-lg font-bold"
                  >
                    {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Unlock className="mr-2 h-6 w-6" />}
                    Present Student ID Proof
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT COLUMN: Terminal Logs */}
          <Card className="flex flex-col bg-[#0a0a0a] border-zinc-800 shadow-2xl overflow-hidden h-[450px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-[#111111]">
              <div className="flex items-center space-x-3">
                <Terminal className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-mono font-medium tracking-wider text-zinc-400">verifier_agent.log</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors"
                onClick={() => setLogs([])}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-5">
              <div className="font-mono text-[13px] space-y-3">
                {logs.length === 0 ? (
                  <div className="flex items-center text-zinc-600">
                    <span className="animate-pulse mr-2 text-violet-500">_</span>
                    <span>Monitoring for authentication attempts...</span>
                  </div>
                ) : (
                  logs.map((log, i) => {
                    let colorClass = "text-zinc-400";
                    if (log.includes("❌")) colorClass = "text-rose-400";
                    if (log.includes("✅")) colorClass = "text-emerald-400";
                    if (log.includes("🔓")) colorClass = "text-violet-400 font-bold";
                    if (log.includes("🚀") || log.includes("⏳")) colorClass = "text-indigo-300";
                    
                    return (
                      <div key={i} className={`${colorClass} break-all leading-relaxed flex space-x-2`}>
                        <span className="text-zinc-700 select-none">{">"}</span>
                        <span>{log.replace(/\[.*?\] /, "")}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Global Style for Scanner Line Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0%, 100% { top: 0; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: 100%; opacity: 1; }
        }
      `}} />
    </div>
  );
}