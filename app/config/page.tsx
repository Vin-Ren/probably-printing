"use client";
import { useState, useEffect } from "react";

export default function ConfigPage() {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [cssString, setCssString] = useState("");
  const [quotesString, setQuotesString] = useState("");
  const [htmlFormatterConfig, setHtmlFormatterConfig] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    async function fetchInitialConfig() {
      try {
        const res = await fetch("/api/config");
        const result = await res.json();
        if (res.ok && result.success) {
          setCssString(result.css_string);
          setQuotesString(result.quotes);
          setHtmlFormatterConfig(result.html_formatter_config);
        }
      } catch (err) {
        console.error("Failed to fetch initial configuration:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    fetchInitialConfig();
  }, []);

  async function handleSubmit() {
    if (!cssString.trim() && !quotesString.trim() && !htmlFormatterConfig.trim()) {
      alert("Please enter CSS string, quotes, or HTML formatter config before submitting.");
      return;
    }

    // Validate quotes JSON if provided
    if (quotesString.trim()) {
      try {
        const quotes = JSON.parse(quotesString);
        if (!Array.isArray(quotes)) {
          alert("Quotes must be a JSON array");
          return;
        }
        // Validate quote structure
        for (const quote of quotes) {
          if (!quote.author || !quote.quote) {
            alert("Each quote must have 'author' and 'quote' fields");
            return;
          }
        }
      } catch {
        alert("Invalid JSON format for quotes");
        return;
      }
    }

    // Validate HTML formatter config JSON if provided
    if (htmlFormatterConfig.trim()) {
      try {
        JSON.parse(htmlFormatterConfig);
      } catch {
        alert("Invalid JSON format for HTML formatter config");
        return;
      }
    }

    setLoading(true);
    const formData = new FormData();
    if (cssString.trim()) formData.append("css_string", cssString);
    if (quotesString.trim()) formData.append("quotes", quotesString);
    if (htmlFormatterConfig.trim()) formData.append("html_formatter_config", htmlFormatterConfig);
    formData.append("secretKey", secretKey);

    try {
      const res = await fetch("/api/config", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Configuration update failed");
      console.log("Config result:", result);
      alert("Configuration updated successfully!");
    } catch (err: Error | unknown) {
      alert("Configuration update failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!confirm("Are you sure you want to reset the configuration? This will delete all saved CSS templates and quotes.")) {
      return;
    }

    setResetting(true);
    const formData = new FormData();
    formData.append("secretKey", secretKey);

    try {
      const response = await fetch("/api/config", {
        method: "DELETE",
        body: formData,
      });

      if (response.ok) {
        setCssString("");
        setQuotesString("");
        setHtmlFormatterConfig("");
        alert("Configuration reset successfully!");
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to reset configuration"}`);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error occurred");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Configuration Management</h2>
          <p className="text-gray-600">Update worker configurations</p>
        </div>

        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-900 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 bg-purple-100 rounded text-xs font-mono text-purple-700">Config Key</span>
            <span className="font-semibold">css_string</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 bg-purple-100 rounded text-xs font-mono text-purple-700">Purpose</span>
            <span>CSS template for PDF generation with dynamic variable injection</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="inline-block px-2 py-1 bg-purple-100 rounded text-xs font-mono text-purple-700 w-fit">Available Variables</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div><code className="bg-purple-200 px-1 rounded">%(teamname)s</code> - Team name</div>
              <div><code className="bg-purple-200 px-1 rounded">%(filename)s</code> - Code filename</div>
              <div><code className="bg-purple-200 px-1 rounded">%(datetime)s</code> - Print timestamp</div>
              <div><code className="bg-purple-200 px-1 rounded">%(quote)s</code> - Random quote</div>
              <div><code className="bg-purple-200 px-1 rounded">%(quote_author)s</code> - Quote author</div>
              <div><code className="bg-purple-200 px-1 rounded">%(jobctx_id)s</code> - Task ID</div>
            </div>
          </div>
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
                : "border-gray-300 focus:ring-purple-300"
            }`}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="cssString">
            CSS String
            {initialLoading && (
              <span className="ml-2 text-xs text-blue-600">Loading current config...</span>
            )}
          </label>
                    <textarea
            value={cssString}
            onChange={(e) => setCssString(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder={`/* CSS Template for PDF Generation */
@page {
  margin: 1in;
  @top-center {
    content: "%(teamname)s - %(filename)s";
    font-family: Arial;
  }
  @bottom-right {
    content: "%(datetime)s";
    font-size: 10px;
  }
}

body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.quote {
  font-style: italic;
  text-align: center;
  margin: 10px 0;
}

/* Use %(variable)s syntax for dynamic content */`}
          />
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              This CSS template uses Python string formatting. Variables are injected using <code className="bg-gray-100 px-1 rounded">%(variable)s</code> syntax.
            </p>
            <p className="text-xs text-blue-600">
              Example: <code className="bg-blue-50 px-1 rounded">{`content: "Team: %(teamname)s | File: %(filename)s";`}</code>
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Quotes (JSON Array)
          </label>
          <textarea
            value={quotesString}
            onChange={(e) => setQuotesString(e.target.value)}
            className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder='Enter quotes as JSON array:
[
  {
    "author": "Author Name",
    "quote": "Quote text here"
  },
  {
    "author": "Another Author", 
    "quote": "Another quote"
  }
]'
          />
        </div>

        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            HTML Formatter Config (JSON)
          </label>
          <textarea
            value={htmlFormatterConfig}
            onChange={(e) => setHtmlFormatterConfig(e.target.value)}
            className="w-full h-32 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder='Enter Pygments HTML formatter configuration:
{
  "full": true,
  "linenos": "inline",
  "style": "bw",
  "cssclass": "codehilite"
}'
          />
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              Configuration for Pygments HTML formatter. Controls syntax highlighting, line numbers, and CSS styling.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || initialLoading || resetting}
            className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold text-lg shadow transition ${
              loading || initialLoading || resetting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Updating...
              </span>
            ) : (
              "Update Configuration"
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={loading || initialLoading || resetting}
            className={`px-6 py-2 rounded-lg font-semibold text-lg shadow transition ${
              loading || initialLoading || resetting
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {resetting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Resetting...
              </span>
            ) : (
              "Reset"
            )}
          </button>
        </div>

        <div className="mt-6 text-center space-y-2">
          <div className="flex justify-center gap-4">
            <a 
              href="/submit" 
              className="text-purple-600 hover:text-purple-800 text-sm font-medium transition"
            >
              ← Back to Submit Page
            </a>
            <a 
              href="/monitor" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
            >
              Monitor Submissions →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
