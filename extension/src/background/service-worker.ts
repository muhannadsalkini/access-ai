/**
 * AccessAI Extension — Background Service Worker (Manifest V3)
 *
 * Kept minimal. Session persistence and token refresh are handled
 * by the Supabase client in the popup using chrome.storage.local.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("[AccessAI] Extension installed.");
  }
});
