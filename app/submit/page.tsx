"use client";
import { useState } from "react";
import { CODE_FILE_ACCEPT, CODE_FILE_MAX_SIZE } from "@/lib/consts";

export default function FileUploader() {
  const [loading, setLoading] = useState(false);
  const [teamname, setTeamname] = useState("anonymous");
  const [file, setFile] = useState<File | null>(null);
  const [secretKey, setSecretKey] = useState("");
  
  const isDevelopment = process.env.NODE_ENV === "development";

  async function handleSubmit() {
    if (!file) {
      alert("Please select a file before submitting.");
      return;
    }

    if (file.size > CODE_FILE_MAX_SIZE) {
      alert(`File too large! Max allowed size is ${CODE_FILE_MAX_SIZE / (1024 * 1024)} MB.`);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", teamname);
    formData.append("secretKey", secretKey);

    try {
      const res = await fetch("/api/submit", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      console.log("Upload result:", result);
      alert("Upload successful!");
      setFile(null); // reset after success
    } catch (err: Error | unknown) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Submit Your Code</h2>
          <p className="text-gray-600">Upload your solution and get started</p>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 bg-blue-100 rounded text-xs font-mono text-blue-700">Accepted files</span>
            <span className="font-semibold">{CODE_FILE_ACCEPT.replace(/,/g, ', ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 bg-blue-100 rounded text-xs font-mono text-blue-700">Max size</span>
            <span className="font-semibold">{CODE_FILE_MAX_SIZE / (1024 * 1024)} MB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 bg-blue-100 rounded text-xs font-mono text-blue-700">Contest rules</span>
            <span>Follow TLX Toki file constraints for submissions.</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="teamname">Team Name</label>
          <input
            id="teamname"
            type="text"
            placeholder="Enter your team name"
            value={teamname}
            onChange={(e) => setTeamname(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="secretKey">
            Secret Key
            {isDevelopment && (
              <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                DEV MODE - DISABLED
              </span>
            )}
          </label>
          <input
            id="secretKey"
            type="password"
            placeholder={isDevelopment ? "Secret key not required in development" : "Enter secret key"}
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            disabled={isDevelopment}
            className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 transition ${
              isDevelopment
                ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                : "border-gray-300 focus:ring-blue-300"
            }`}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="file">Code File</label>
          <input
            id="file"
            type="file"
            accept={CODE_FILE_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
          />
        </div>

        {file && (
          <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
            <span className="font-semibold">Selected:</span>
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{file.name}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full px-4 py-2 rounded-lg text-white font-semibold text-lg shadow transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Uploading...
            </span>
          ) : (
            "Submit"
          )}
        </button>
      </div>
    </div>
  );
}
