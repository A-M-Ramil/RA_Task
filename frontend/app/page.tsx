"use client";

import { useState, useRef } from "react";

const API_BASE_URL = "http://127.0.0.1:8002";

export default function SSITester() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Connection States
  const [connectionId, setConnectionId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Form States
  const [studentName, setStudentName] = useState("Ahammod Munim Ramil");
  const [studentId, setStudentId] = useState("22101123");
  const [department, setDepartment] = useState("CSE");
  const [email, setEmail] = useState("ramil@example.com");

  const addLog = (message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  // --- 1. GENERATE QR CODE ---
  const generateQR = async () => {
    setLoading(true);
    addLog("⏳ Generating connection invitation...");
    try {
      const res = await fetch(`${API_BASE_URL}/protocol1/create-invitation`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok) {
        setConnectionId(data.connection_id);
        setInviteUrl(data.invitation_url);
        setIsConnected(false);
        addLog(`✅ Invitation created! (ID: ${data.connection_id.slice(0, 8)}...)`);
        addLog("👀 Waiting for student to scan QR code...");
        
        // Start polling automatically
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
      const res = await fetch(`${API_BASE_URL}/protocol1/check-connection/${cId}`);
      const data = await res.json();

      if (res.ok && data.connected) {
        setIsConnected(true);
        addLog(`✅ Wallet Connected Successfully!`);
        if (pollingRef.current) clearTimeout(pollingRef.current);
        return; // Stop polling
      }
    } catch (err) {
      console.error("Polling error:", err);
    }

    // If not connected, check again in 3 seconds
    pollingRef.current = setTimeout(() => pollConnectionStatus(cId), 3000);
  };

  // --- 3. ISSUE CREDENTIAL ---
  const issueCredential = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      addLog(`🚀 Sending Student ID to connected wallet...`);
      const res = await fetch(`${API_BASE_URL}/protocol1/issue-credential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_id: connectionId,
          student_name: studentName,
          student_id: studentId,
          department: department,
          email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // data.detail contains the string we wrote in FastAPI
        setErrorMessage(data.detail || "Failed to issue credential.");
        addLog(`❌ Backend Error: ${data.detail}`);
        setLoading(false);
        return; // Stop the flow immediately
      }
      else if (res.ok) {
        addLog(`✅ Success! Credential offered to wallet.`);
      } else {
        addLog(`❌ Backend Error: ${JSON.stringify(data.detail)}`);
      }
    } catch (err) {
      setErrorMessage("Network error: Could not connect to the backend.");
      addLog(`❌ Network Error: ${err}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold border-b pb-4">BRACU Student ID Portal</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Registration Flow */}
          <div className="space-y-6">
            
            {/* Step 1: Form Data */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">1. Student Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Student Name</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full border rounded p-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Student ID</label>
                    <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full border rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Department</label>
                    <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full border rounded p-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded p-2 text-sm" />
                </div>
              </div>
            </div>

            {/* Step 2: Connection & Issuance */}
            <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center text-center">
              <h2 className="text-xl font-semibold mb-2 w-full text-left">2. Connect & Issue</h2>
              
              {!inviteUrl && (
                <button onClick={generateQR} disabled={loading} className="w-full bg-blue-600 text-white rounded py-3 mt-4 hover:bg-blue-700 font-medium">
                  Generate Connect QR Code
                </button>
              )}

              {inviteUrl && !isConnected && (
                <div className="mt-4 flex flex-col items-center animate-pulse">
                  <p className="text-sm text-gray-500 mb-4">Scan with Bifold / BC Wallet</p>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}`} 
                    alt="Scan to connect" 
                    className="border-4 border-white shadow-lg rounded"
                  />
                  <p className="text-sm font-medium text-blue-600 mt-4">Waiting for connection...</p>
                </div>
              )}
              {/* 🚨 ERROR BANNER 🚨 */}
          {errorMessage && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Issuance Blocked</h3>
                  <div className="mt-1 text-sm text-red-700">
                    <p>{errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
              {isConnected && (
                <div className="mt-4 w-full animate-in fade-in zoom-in duration-300">
                  <div className="bg-green-50 text-green-700 border border-green-200 rounded p-4 mb-4">
                    🎉 Wallet successfully connected!
                  </div>
                  <button onClick={issueCredential} disabled={loading} className="w-full bg-green-600 text-white rounded py-3 hover:bg-green-700 font-bold shadow-md">
                    Issue Student ID to Wallet
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Terminal Logs */}
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow-sm border border-gray-800 flex flex-col h-[700px]">
            <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
              <h2 className="text-lg font-mono text-gray-100">System Logs</h2>
              <button onClick={() => setLogs([])} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">Clear</button>
            </div>
            <div className="overflow-y-auto flex-1 font-mono text-sm space-y-2">
              {logs.length === 0 ? (
                <span className="text-gray-500">System idle...</span>
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