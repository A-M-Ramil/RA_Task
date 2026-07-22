"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation"; // <--- Add this
const API_BASE_URL = "http://127.0.0.1:8002";

export default function LoginTester() {
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
    addLog("⏳ Generating login invitation...");
    try {
      const res = await fetch(`${API_BASE_URL}/protocol2/connect-verifier`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok) {
        setConnectionId(data.connection_id);
        setInviteUrl(data.invitation_url);
        setIsConnected(false);
        addLog(`✅ Invitation created! (ID: ${data.connection_id.slice(0, 8)}...)`);
        addLog("👀 Waiting for student to scan QR code...");
        
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
        addLog(`✅ Wallet Connected Successfully!`);
        if (pollingRef.current) clearTimeout(pollingRef.current);
        return; 
      }
    } catch (err) {
      console.error("Polling error:", err);
    }

    pollingRef.current = setTimeout(() => pollConnectionStatus(cId), 3000);
  };

  // --- 3. REQUEST PROOF (VERIFICATION) ---
  // --- 4. SILENT POLLING FOR PROOF ---
  const pollProofStatus = async (presExId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/protocol2/check-proof/${presExId}`);
      const data = await res.json();

      if (res.ok && data.verified) {
        addLog(`✅ Identity Verified! Redirecting...`);
        if (pollingRef.current) clearTimeout(pollingRef.current);
        
        // Save the verified data to the browser's session storage
        sessionStorage.setItem("bracu_user", JSON.stringify(data.user_data));
        
        // Redirect to the dashboard
        router.push("/dashboard");
        return; 
      }
    } catch (err) {
      console.error("Proof polling error:", err);
    }

    // Keep checking every 2 seconds
    pollingRef.current = setTimeout(() => pollProofStatus(presExId), 2000);
  };

  // --- 3. REQUEST PROOF (VERIFICATION) ---
  const requestProof = async () => {
    setLoading(true);
    try {
      addLog(`🚀 Requesting BRACU Student ID proof from wallet...`);
      const res = await fetch(`${API_BASE_URL}/protocol2/request-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        addLog(`✅ Proof request sent. Check your phone!`);
        // Start checking if they accepted it
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
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold border-b pb-4">BRACU Portal Login</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Verification Flow */}
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center text-center">
              <h2 className="text-xl font-semibold mb-2 w-full text-left">Authenticate with Wallet</h2>
              
              {!inviteUrl && (
                <button onClick={generateQR} disabled={loading} className="w-full bg-blue-600 text-white rounded py-3 mt-4 hover:bg-blue-700 font-medium">
                  Generate Login QR Code
                </button>
              )}

              {inviteUrl && !isConnected && (
                <div className="mt-4 flex flex-col items-center animate-pulse">
                  <p className="text-sm text-gray-500 mb-4">Scan with Bifold / BC Wallet to Login</p>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}`} 
                    alt="Scan to login" 
                    className="border-4 border-white shadow-lg rounded"
                  />
                  <p className="text-sm font-medium text-blue-600 mt-4">Waiting for connection...</p>
                </div>
              )}

              {isConnected && (
                <div className="mt-4 w-full animate-in fade-in zoom-in duration-300">
                  <div className="bg-green-50 text-green-700 border border-green-200 rounded p-4 mb-4">
                    🎉 Wallet connected! Ready to verify identity.
                  </div>
                  <button onClick={requestProof} disabled={loading} className="w-full bg-indigo-600 text-white rounded py-3 hover:bg-indigo-700 font-bold shadow-md">
                    Request Student ID Proof
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Terminal Logs */}
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow-sm border border-gray-800 flex flex-col h-[600px]">
            <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
              <h2 className="text-lg font-mono text-gray-100">Verification Logs</h2>
              <button onClick={() => setLogs([])} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">Clear</button>
            </div>
            <div className="overflow-y-auto flex-1 font-mono text-sm space-y-2">
              {logs.length === 0 ? (
                <span className="text-gray-500">Awaiting login attempt...</span>
              ) : (
                logs.map((log, i) => <div key={i} className="break-all">{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}