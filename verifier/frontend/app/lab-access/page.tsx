"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  Server, 
  Cpu, 
  Microchip,
  Activity,
  Lock
} from "lucide-react";

interface UserData {
  student_name: string;
  student_id: string;
  department: string;
  email: string;
}

export default function CSELabPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // 1. Check for the existing session (No re-authentication!)
    const storedUser = sessionStorage.getItem("bracu_user");
    
    if (!storedUser) {
      router.push("/login");
    } else {
      setUserData(JSON.parse(storedUser));
    }
  }, [router]);

  if (!userData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100">
        <Activity className="h-8 w-8 text-emerald-500 animate-pulse mb-4" />
        <p className="font-mono text-sm text-zinc-400">Verifying session token...</p>
      </div>
    );
  }

  // 2. Role-Based Access Control Check
  const isCSE = userData.department.toUpperCase().includes("CSE") || userData.department.toUpperCase().includes("COMPUTER SCIENCE");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      
      {/* Abstract Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[120px]"></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl backdrop-blur-md shadow-xl">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Server className="h-6 w-6 text-emerald-500" />
              Advanced Systems Lab
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 font-mono">
                ID: {userData.student_id}
              </Badge>
              <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 font-mono">
                DEPT: {userData.department}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => router.push("/dashboard")}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>
        </div>

        {/* Access Control Logic */}
        {!isCSE ? (
          <Alert variant="destructive" className="bg-rose-950/20 border-rose-900/50 py-6 animate-in zoom-in-95">
            <ShieldAlert className="h-6 w-6 stroke-rose-500" />
            <AlertTitle className="text-xl font-bold text-rose-400 ml-2">Access Denied</AlertTitle>
            <AlertDescription className="text-zinc-300 mt-2 ml-2 text-base">
              Your verified cryptographic credential states your department is <strong className="text-rose-300 font-mono">{userData.department}</strong>. 
              Only Computer Science & Engineering (CSE) students are authorized to view and book this hardware.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            
            <Alert className="bg-emerald-950/20 border-emerald-900/50 py-4">
              <ShieldCheck className="h-5 w-5 stroke-emerald-500" />
              <AlertTitle className="text-emerald-400 font-bold ml-2">Clearance Granted</AlertTitle>
              <AlertDescription className="text-emerald-500/80 ml-2">
                CSE Department credential verified securely via blockchain anchor.
              </AlertDescription>
            </Alert>

            <div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-zinc-400" />
                Available Compute Nodes
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Node Alpha - Available */}
                <Card className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-colors duration-300 group">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-zinc-100 group-hover:text-emerald-400 transition-colors">Node Alpha</CardTitle>
                        <CardDescription className="text-zinc-500 mt-1 font-mono text-xs">High-Performance Workstation</CardDescription>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">
                        Available
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <Cpu className="h-4 w-4 text-zinc-500" />
                      Ryzen 9 7950X
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <Server className="h-4 w-4 text-zinc-500" />
                      RX 9070 XT 16GB
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <Microchip className="h-4 w-4 text-zinc-500" />
                      64GB DDR5 RAM
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/20">
                      Book Node Alpha
                    </Button>
                  </CardFooter>
                </Card>

                {/* Node Beta - In Use */}
                <Card className="bg-zinc-900/30 border-zinc-800 opacity-80">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-zinc-400">Node Beta</CardTitle>
                        <CardDescription className="text-zinc-500 mt-1 font-mono text-xs">Deep Learning Cluster</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-rose-950/30 text-rose-400 border-rose-900/50">
                        In Use
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <Cpu className="h-4 w-4 text-zinc-600" />
                      Dual EPYC 7763
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <Server className="h-4 w-4 text-zinc-600" />
                      4x RTX 4090
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <Microchip className="h-4 w-4 text-zinc-600" />
                      256GB ECC RAM
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button disabled variant="outline" className="w-full bg-zinc-950 border-zinc-800 text-zinc-600">
                      <Lock className="h-4 w-4 mr-2" />
                      Currently Booked
                    </Button>
                  </CardFooter>
                </Card>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}