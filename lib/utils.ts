import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // illegal chars
    .replace(/\s+/g, '_')                   // spaces to underscores
    .replace(/_+/g, '_')                    // collapse underscores
    .replace(/^\.+/, '')                    // leading dots
    .slice(0, 255);                         // max length
}
