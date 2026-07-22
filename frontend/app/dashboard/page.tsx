"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserData {
  student_name: string;
  student_id: string;
  email: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // Read the securely verified data from session storage
    const storedUser = sessionStorage.getItem("bracu_user");
    
    if (!storedUser) {
      // If there is no verified session, kick them back to login
      router.push("/login");
    } else {
      setUserData(JSON.parse(storedUser));
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("bracu_user");
    router.push("/login");
  };

  if (!userData) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BRACU Student Portal</h1>
            <p className="text-sm text-green-600 font-medium mt-1">✓ Identity cryptographically verified</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => router.push("/lab")}
              className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 transition font-medium"
            >
              Access Hardware Lab
            </button>
            <button 
              onClick={handleLogout}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition"
            >
              Log Out
            </button>
          </div>
        </div>
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        {/* <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BRACU Student Portal</h1>
            <p className="text-sm text-green-600 font-medium mt-1">✓ Identity cryptographically verified</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition"
          >
            Log Out
          </button>
        </div> */}

        {/* User Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Verified Credential Data</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student Name</label>
              <div className="text-lg text-gray-900 font-medium">{userData.student_name}</div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student ID</label>
              <div className="text-lg text-gray-900 font-medium">{userData.student_id}</div>
            </div>

            <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">University Email</label>
              <div className="text-lg text-gray-900 font-medium">{userData.email}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}