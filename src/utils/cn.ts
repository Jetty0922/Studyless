import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  // NativeWind doesn't require tailwind-merge; keep this helper lightweight.
  return clsx(inputs);
}
