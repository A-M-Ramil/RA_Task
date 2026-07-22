"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  if (!userData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  // 2. Role-Based Access Control Check
  const isCSE = userData.department.toUpperCase().includes("CSE") || userData.department.toUpperCase().includes("COMPUTER SCIENCE");

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Advanced Systems Lab</h1>
            <p className="text-sm text-gray-400 mt-1">Authenticated as: {userData.student_id}</p>
          </div>
          <button 
            onClick={() => router.push("/dashboard")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
          >
            ← Back to Portal
          </button>
        </div>

        {/* Access Control Logic */}
        {!isCSE ? (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-8 text-center mt-8">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-red-200">
              Your verified credential states your department is <strong>{userData.department}</strong>. 
              Only CSE students are authorized to book this hardware.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-green-900/30 border border-green-800 rounded-lg p-5">
              <p className="text-green-200 text-sm">
                <strong>Access Granted:</strong> CSE Department credential verified securely via blockchain anchor.
              </p>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4 border-b border-gray-700 pb-2">Available Hardware Nodes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-blue-500 transition cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg group-hover:text-blue-400">Node Alpha</h3>
                  <span className="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded border border-green-800">Available</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">Ryzen 9 7950X • RX 9070 XT 16GB • 64GB DDR5</p>
                <button className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-sm font-medium transition">Book Node</button>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-blue-500 transition cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg group-hover:text-blue-400">Node Beta</h3>
                  <span className="bg-red-900/50 text-red-400 text-xs px-2 py-1 rounded border border-red-800">In Use</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">Dual EPYC 7763 • 4x RTX 4090 • 256GB RAM</p>
                <button disabled className="w-full bg-gray-700 text-gray-500 py-2 rounded text-sm font-medium cursor-not-allowed">Currently Booked</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}