// lib/constants.ts

// Allowed extensions for code uploads
export const CODE_FILE_EXTENSIONS = [
  ".c",
  ".cpp",
  ".cs",
  ".d",
  ".fs",
  ".go",
  ".hs",
  ".java",
  ".kt",
  ".ml",
  ".pas",
  ".pl",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".js",
];

// Turn into a string for <input accept="">
export const CODE_FILE_ACCEPT = CODE_FILE_EXTENSIONS.join(",");
export const ALLOW_ALL_EXTENSIONS=process.env.ALLOW_ALL_EXTENSIONS === 'true';

// File size limit (bytes) 1 MB
export const CODE_FILE_MAX_SIZE = 1 * 1024 * 1024;

type SubmitSourceEntry = {
  name: string;
  badgeClasses: string;
}

export const SUBMIT_SOURCES: Record<string, SubmitSourceEntry> = { // For monitoring page and api responses if disabled.
  'api/submit': { // This is always allowed. You can not disable direct submissions.
    name: "Direct",
    badgeClasses: "bg-blue-100 text-blue-800"
  },
  'api/submit-via-judgels': {
    name: "Judgels",
    badgeClasses: "bg-green-100 text-green-800"
  },
  'unknown': {
    name: "Unknown",
    badgeClasses: "bg-gray-100 text-gray-800"
  },
  'monitor': { // For resubmissions via the monitoring page.
    name: "Monitor",
    badgeClasses: "bg-pink-100 text-pink-800"
  }
};

// Comma seperated entries of the plugin endpoint.
// Example: "api/submit-via-judgels"
export const ENABLED_PLUGINS = process.env.ENABLED_PLUGINS ? process.env.ENABLED_PLUGINS.split(",").map(p => p.trim()).filter(Boolean) : [];
