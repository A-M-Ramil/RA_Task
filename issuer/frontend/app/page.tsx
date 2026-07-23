"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, QrCode, CheckCircle2, AlertCircle, ShieldCheck, Loader2, Trash2, GraduationCap, ArrowRight } from "lucide-react";

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
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans antialiased">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-200/80">
                    <div className="h-12 w-12 rounded-xl bg-indigo-600/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black">
                            BRACU Identity Registrar
                        </h1>
                        <p className="text-base text-black font-medium tracking-wide mt-0.5">
                            Zero-Trust Credential Issuance Portal
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  

                    {/* LEFT COLUMN: Controls */}
                    <div className="lg:col-span-7 space-y-6">
                      

                        {/* Form Card */}
                        <Card className="border-slate-200/80 shadow-sm bg-white/80 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold text-black">Student Details</CardTitle>
                                <CardDescription className="text-black text-sm">
                                    Enter the verified records to be cryptographically signed.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-slate-700 font-medium text-sm">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                        className="border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 bg-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="studentId" className="text-slate-700 font-medium text-sm">Student ID</Label>
                                        <Input
                                            id="studentId"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            className="border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="department" className="text-slate-700 font-medium text-sm">Department</Label>
                                        <Input
                                            id="department"
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value)}
                                            className="border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-slate-700 font-medium text-sm">University Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 bg-white"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                     {/* Action Card - now light, matching the form */}
                        <Card className="border-slate-200/80 shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-black">
                                    <span className="p-1.5 rounded-lg bg-indigo-50">
                                        <QrCode className="h-4 w-4 text-indigo-600" />
                                    </span>
                                    Connection &amp; Issuance
                                </CardTitle>
                                <CardDescription className="text-black text-sm">
                                    Securely connect a mobile wallet and issue credentials.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-col items-center justify-center min-h-[240px] pt-2">

                                {!inviteUrl && (
                                    <Button
                                        onClick={generateQR}
                                        disabled={loading}
                                        size="lg"
                                        className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 font-semibold text-base h-12"
                                    >
                                        {loading ? <Loader2 className="mr-2.5 h-4 w-4 animate-spin" /> : <QrCode className="mr-2.5 h-4 w-4" />}
                                        Generate Connection QR
                                    </Button>
                                )}

                                {inviteUrl && !isConnected && (
                                    <div className="flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="bg-white p-3 rounded-2xl shadow-xl ring-1 ring-slate-200/80">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`}
                                                alt="Scan to connect"
                                                className="rounded-xl w-48 h-48"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2.5 text-slate-600 bg-slate-100/80 px-4 py-2 rounded-full backdrop-blur-sm">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                            <span className="text-sm font-medium">Waiting for wallet scan...</span>
                                        </div>
                                    </div>
                                )}

                                {isConnected && (
                                    <div className="w-full space-y-6 animate-in fade-in zoom-in duration-300">
                                        <Alert className="bg-emerald-50/80 text-emerald-800 border-emerald-200/80 rounded-xl">
                                            <CheckCircle2 className="h-4 w-4 stroke-emerald-600" />
                                            <AlertTitle className="text-emerald-800 font-semibold">Secure Connection Established</AlertTitle>
                                            <AlertDescription className="text-emerald-700/80 text-sm">
                                                The mobile wallet is ready to receive credentials.
                                            </AlertDescription>
                                        </Alert>

                                        <Button
                                            onClick={issueCredential}
                                            disabled={loading}
                                            size="lg"
                                            className="w-full bg-emerald-700 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 font-semibold text-base h-12 group"
                                        >
                                            {loading ? (
                                                <Loader2 className="mr-2.5 h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <ShieldCheck className="mr-2.5 h-4 w-4" />
                                                    Issue Official Student ID
                                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {errorMessage && (
                                    <Alert variant="destructive" className="mt-6 bg-red-50/80 border-red-200/80 text-red-800 rounded-xl">
                                        <AlertCircle className="h-4 w-4 stroke-red-600" />
                                        <AlertTitle className="text-red-800 font-semibold">Issuance Blocked</AlertTitle>
                                        <AlertDescription className="text-red-700/80 text-sm">{errorMessage}</AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                       

                    {/* RIGHT COLUMN: Terminal - kept dark for contrast */}
                    <div className="lg:col-span-5 flex flex-col h-full">
                        <Card className="flex-1 flex flex-col border-slate-200/80 shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden min-h-[500px]">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/80">
                                <div className="flex items-center gap-2.5">
                                    <span className="p-1 rounded-md bg-slate-200/80">
                                        <Terminal className="h-3.5 w-3.5 text-slate-600" />
                                    </span>
                                    <span className="text-xs font-mono font-medium text-slate-600 tracking-wider uppercase">system.log</span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-200/80 rounded-md"
                                    onClick={() => setLogs([])}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <ScrollArea className="flex-1 p-5 bg-slate-50/30">
                                <div className="font-mono text-xs space-y-2.5 leading-relaxed">
                                    {logs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                                            <span className="text-sm font-mono">⏳ Awaiting operations...</span>
                                            <span className="text-xs text-slate-300 mt-1">System idle</span>
                                        </div>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div
                                                key={i}
                                                className={`break-all px-3 py-1.5 rounded-md ${log.includes("❌") ? "bg-red-50/80 text-red-600 border-l-2 border-red-400" :
                                                    log.includes("✅") ? "bg-emerald-50/80 text-emerald-700 border-l-2 border-emerald-400" :
                                                    log.includes("🚀") ? "bg-blue-50/80 text-blue-600 border-l-2 border-blue-400" :
                                                    "text-slate-600"
                                                }`}
                                            >
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