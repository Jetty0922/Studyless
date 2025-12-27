/**
 * Admin Configuration
 * 
 * Hardcoded list of admin emails that have access to debug tools.
 * This is client-side only (fine for dev/debug tools).
 */

// Add your email here to get admin access
export const ADMIN_EMAILS = [
  'jettkimray090922@gmail.com', // Replace with your actual email
];

/**
 * Check if a user email is an admin
 */
export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

