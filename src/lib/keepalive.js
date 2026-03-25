/**
 * keepalive.js
 * Pings Supabase every 4 days to prevent free-tier project pausing.
 * Supabase pauses projects after 7 days of inactivity. By pinging every 4 days,
 * we ensure the project stays alive while the app is in use.
 */
export function startKeepalive(supabaseClient) {
  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

  const ping = async () => {
    try {
      await supabaseClient
        .from('datasets')
        .select('count', { count: 'exact', head: true });
    } catch {
      // Silently ignore keepalive failures — non-critical
    }
  };

  // Ping immediately on load, then every 4 days
  ping();
  setInterval(ping, FOUR_DAYS_MS);
}
