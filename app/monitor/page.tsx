"use client";
import { SUBMIT_SOURCES } from "@/lib/consts";
import { useState, useEffect, useRef } from "react";

interface SubmissionEvent {
  type: string;
  timestamp: string;
  teamname: string;
  filename: string;
  fileUrl: string;
  id: string;
  source?: string;
}

export default function MonitorPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [submissions, setSubmissions] = useState<SubmissionEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isDevelopment = process.env.NODE_ENV === "development" || process.env.MODE === "development";

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.preload = "auto";
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const authenticate = () => {
    if (isDevelopment || secretKey.trim()) {
      setAuthenticated(true);
      connectToMonitor();
    } else {
      setError("Please enter a secret key");
    }
  };

  const connectToMonitor = () => {
    const url = `/api/monitor?secretKey=${encodeURIComponent(secretKey)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError("");
      console.log("Connected to monitor");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log("Monitor connected");
          return;
        }
        
        if (data.type === 'error') {
          setError(data.message);
          return;
        }

        // Handle submission event
        if (data.type === 'submission') {
          const newSubmission: SubmissionEvent = {
            type: data.type,
            timestamp: data.timestamp || new Date().toISOString(),
            teamname: data.teamname || 'Unknown',
            filename: data.filename || 'Unknown',
            fileUrl: data.fileUrl || '',
            id: data.id || Date.now().toString(),
            source: data.source || 'unknown',
          };
          
          setSubmissions(prev => [newSubmission, ...prev]);
          
          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.log("Audio play failed:", err));
          }
        }
      } catch (error) {
        console.error("Error parsing event data:", error);
      }
    };

    eventSource.onerror = (event) => {
      console.error("EventSource error:", event);
      setConnected(false);
      
      // Only show reconnect message if the connection was previously established
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        setError("Connection lost. Attempting to reconnect...");
        
        // Close the current connection properly
        eventSourceRef.current?.close();
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          console.log("Attempting to reconnect...");
          connectToMonitor();
        }, 3000);
      } else {
        setError("Failed to connect to monitor");
      }
    };
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      console.log("Manually disconnecting from monitor");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
    setAuthenticated(false);
    setSubmissions([]);
    setError("");
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Submission Monitor</h2>
            <p className="text-gray-600">Enter secret key to access real-time monitoring</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="secretKey">
              Secret Key
              {isDevelopment && (
                <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  DEV MODE - OPTIONAL
                </span>
              )}
            </label>
            <input
              id="secretKey"
              type="password"
              placeholder={isDevelopment ? "Secret key optional in development" : "Enter secret key"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && authenticate()}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <button
            onClick={authenticate}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow transition"
          >
            Connect to Monitor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Submission Monitor</h1>
              <p className="text-gray-600 mt-1">Real-time monitoring of file submissions</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {connected ? 'Connected' : 'Disconnected'}
              </div>
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Submissions</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{submissions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-700">Active Teams</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {new Set(submissions.map(s => s.teamname)).size}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-700">Last Submission</h3>
            <p className="text-sm font-medium text-gray-600 mt-2">
              {submissions.length > 0 ? formatDate(submissions[0].timestamp) : 'No submissions yet'}
            </p>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Recent Submissions</h2>
          </div>
          
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No submissions received yet. Waiting for new submissions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission, index) => (
                    <tr key={submission.id} className={index === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(submission.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {submission.teamname}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.fileUrl ? (
                          <a 
                            href={submission.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View File
                          </a>
                        ) : (
                          <span className="text-gray-400">No URL</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          SUBMIT_SOURCES[submission.source || 'unknown'].badgeClasses || 'bg-gray-100 text-gray-800'
                        }`}>
                          {SUBMIT_SOURCES[submission.source || 'unknown'].name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {submission.id.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}