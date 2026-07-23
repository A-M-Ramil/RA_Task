"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MessagingPanel from "@/components/MessagingPanel";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Grab the verified session data
    const storedUser = sessionStorage.getItem("bracu_user");
    
    if (!storedUser) {
      router.push("/"); // Kick unauthenticated users back to login
    } else {
      // 2. Extract the student ID from the session payload
      const userData = JSON.parse(storedUser);
      setStudentId(userData.student_id);
    }
  }, [router]);

  // Prevent rendering the panel until the ID is loaded
  if (!studentId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
        <p className="font-mono text-sm text-zinc-400 animate-pulse">Decrypting session...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans">
      <div className="mx-auto max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-zinc-800 pb-6">
          <div className="bg-violet-500/10 p-3 rounded-xl border border-violet-500/20">
            <MessageSquare className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Secure Messages</h1>
            <p className="text-zinc-400 text-sm mt-1 font-mono">End-to-End Encrypted via DIDComm</p>
          </div>
        </div>

        {/* 
          Pass the dynamically retrieved ID to your panel.
          The MessagingPanel component will now fetch or create the 
          correct ACA-Py connection for this specific student.
        */}
        <MessagingPanel role="student" ownerId={studentId} ownerLabel="Student" />
        
      </div>
    </main>
  );
}