"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  ShieldAlert, 
  LogOut, 
  UserSquare2, 
  Binary, 
  GraduationCap, 
  Mail,
  Fingerprint
} from "lucide-react";

interface UserData {
  student_name: string;
  student_id: string;
  department: string;
  email: string;
  lab_authorized: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const handleLabAccessClick = () => {
    router.push("/lab-access");
  };
  useEffect(() => {
    // Read the securely verified data from the session
    const storedData = sessionStorage.getItem("bracu_user");
    
    if (storedData) {
      setUserData(JSON.parse(storedData));
      setLoading(false);
    } else {
      // If someone tries to visit the dashboard without logging in via SSI, kick them out
      router.push("/");
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("bracu_user");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Fingerprint className="h-12 w-12 text-violet-500 mb-4 animate-bounce" />
          <p className="text-zinc-400 font-mono">Decrypting Zero-Knowledge Proof...</p>
        </div>
      </div>
    );
  }

  if (!userData) return null; // Prevent flicker before redirect

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans">
      
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-[20%] w-[50%] h-[30%] rounded-full bg-violet-900/10 blur-[120px]"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">BRACU Campus Network</h1>
            <p className="text-zinc-400 text-sm mt-1">Decentralized Identity Verified</p>
          </div>
          <div className="flex items-center gap-4">
          <Button 
            variant="outline"
            onClick={handleLabAccessClick}
            className="bg-emerald-600/50 border-emerald-600 h-10 w-40 hover:bg-emerald-500 text-white font-medium shadow-sm transition-colors duration-200"
            >
              <ShieldCheck className="h-4 w-4 " />
              Lab Access
            </Button>

            <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-rose-950/30 h-10  border-rose-900/50 text-rose-200 hover:bg-rose-900/40 hover:text-rose-100 hover:border-rose-700 transition-colors duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect Wallet
              </Button>
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* PROFILE CARD */}
          <Card className="md:col-span-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <UserSquare2 className="h-5 w-5 text-violet-400" />
                Verified Identity
              </CardTitle>
              <CardDescription className="text-zinc-400">Cryptographically signed by BRACU Registrar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Full Name</p>
                <p className="text-lg font-semibold text-zinc-100">{userData.student_name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Binary className="h-3.5 w-3.5" /> Student ID
                </p>
                <p className="text-md font-mono text-violet-300">{userData.student_id}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Department
                </p>
                <p className="text-md text-zinc-200">{userData.department}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> University Email
                </p>
                <p className="text-md text-zinc-200">{userData.email}</p>
              </div>

            </CardContent>
          </Card>

          {/* ACCESS STATUS CARD */}
          <Card className={`md:col-span-7 border ${userData.lab_authorized ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-rose-950/20 border-rose-900/50'} backdrop-blur-md relative overflow-hidden`}>
            
            {/* Dynamic Glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${userData.lab_authorized ? 'bg-emerald-600/20' : 'bg-rose-600/20'}`}></div>

            <CardHeader>
              <CardTitle className="text-zinc-100">Lab & Building Access</CardTitle>
              <CardDescription className="text-zinc-400">Determined via Zero-Knowledge Selective Disclosure</CardDescription>
            </CardHeader>
            
            <CardContent className="flex flex-col items-center justify-center min-h-[250px] text-center p-6">
              
              {userData.lab_authorized ? (
                <div className="space-y-4 animate-in zoom-in duration-500">
                  <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <ShieldCheck className="h-10 w-10 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-emerald-400 tracking-tight">ACCESS GRANTED</h2>
                    <p className="text-emerald-400/80 mt-2 font-medium">CSE Hardware & IoT Labs Unlocked</p>
                  </div>
                  <p className="text-sm text-zinc-400 max-w-sm mt-4 leading-relaxed">
                    Based on your verified cryptographic proof, your department attribute (<span className="text-zinc-200 font-mono">{userData.department}</span>) satisfies the RBAC requirements for entry.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in duration-500">
                  <div className="mx-auto w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center border-2 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                    <ShieldAlert className="h-10 w-10 text-rose-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-rose-400 tracking-tight">ACCESS DENIED</h2>
                    <p className="text-rose-400/80 mt-2 font-medium">Restricted to CSE Faculty and Students</p>
                  </div>
                  <p className="text-sm text-zinc-400 max-w-sm mt-4 leading-relaxed">
                    Your department attribute (<span className="text-zinc-200 font-mono">{userData.department}</span>) does not meet the necessary permissions to access this facility.
                  </p>
                </div>
              )}

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}