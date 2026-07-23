"use client";

import { useState } from "react";
import MessagingPanel from "@/components/MessagingPanel";

export default function FacultyPage() {
  const [facultyId, setFacultyId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!submitted) {
    return (
      <main className="mx-auto max-w-md px-6 py-10">
        <h1 className="mb-4 text-xl font-medium text-slate-900">Faculty messaging console</h1>
        <input
          value={facultyId}
          onChange={(e) => setFacultyId(e.target.value)}
          placeholder="Your name or email"
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => facultyId.trim() && setSubmitted(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Continue
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-xl font-medium text-slate-900">Messages</h1>
      <MessagingPanel role="faculty" ownerId={facultyId} ownerLabel={facultyId} />
    </main>
  );
}