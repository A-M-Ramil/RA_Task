"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, QrCode, CheckCircle2, AlertCircle, ShieldCheck, Loader2, Trash2 } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function IssuerPortal() {
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
        return; 
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
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
        setErrorMessage(data.detail || "Failed to issue credential.");
        addLog(`❌ Backend Error: ${data.detail}`);
      } else {
        addLog(`✅ Success! Credential offered to wallet.`);
      }
    } catch (err) {
      setErrorMessage("Network error: Could not connect to the backend.");
      addLog(`❌ Network Error: ${err}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12 text-zinc-900 font-sans selection:bg-zinc-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-3 border-b pb-6">
          <ShieldCheck className="h-8 w-8 text-zinc-900" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">BRACU Identity Registrar</h1>
            <p className="text-sm text-zinc-500">Zero-Trust Credential Issuance Portal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Details</CardTitle>
                <CardDescription>Enter the verified records to be cryptographically signed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input id="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">University Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Action Card */}
            <Card className="bg-zinc-900 text-zinc-50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Connection & Issuance
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[220px]">
                
                {!inviteUrl && (
                  <Button 
                    onClick={generateQR} 
                    disabled={loading} 
                    size="lg"
                    className="w-full max-w-sm bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                    Generate Connection QR
                  </Button>
                )}

                {inviteUrl && !isConnected && (
                  <div className="flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white p-3 rounded-xl shadow-lg">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`} 
                        alt="Scan to connect" 
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex items-center space-x-2 text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm font-medium">Waiting for Bifold/BC Wallet scan...</span>
                    </div>
                  </div>
                )}

                {isConnected && (
                  <div className="w-full space-y-6 animate-in fade-in zoom-in duration-300">
                    <Alert className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      <CheckCircle2 className="h-4 w-4 stroke-emerald-500" />
                      <AlertTitle>Secure Connection Established</AlertTitle>
                      <AlertDescription>The mobile wallet is ready to receive credentials.</AlertDescription>
                    </Alert>
                    
                    <Button 
                      onClick={issueCredential} 
                      disabled={loading} 
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 shadow-lg"
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Issue Official Student ID
                    </Button>
                  </div>
                )}

                {errorMessage && (
                  <Alert variant="destructive" className="mt-6 bg-red-950/50 border-red-900 text-red-200">
                    <AlertCircle className="h-4 w-4 stroke-red-500" />
                    <AlertTitle>Issuance Blocked</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Terminal */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <Card className="flex-1 flex flex-col bg-[#0c0c0e] border-zinc-800 shadow-2xl overflow-hidden min-h-[500px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#121214]">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-zinc-500" />
                  <span className="text-xs font-mono text-zinc-400">system.log</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  onClick={() => setLogs([])}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="font-mono text-xs space-y-2">
                  {logs.length === 0 ? (
                    <span className="text-zinc-600">Awaiting operations...</span>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={`break-all leading-relaxed ${
                        log.includes("❌") ? "text-red-400" : 
                        log.includes("✅") ? "text-emerald-400" : 
                        log.includes("🚀") ? "text-blue-400" : 
                        "text-zinc-300"
                      }`}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}