/**
 * Debug component to log API responses for payment pending debugging
 * Paste this in the browser console to monitor API responses
 */

export function setupAPIDebugLogging() {
  // Override fetch to log all responses
  const originalFetch = window.fetch;

  window.fetch = function(...args) {
    const [resource, config] = args;

    return originalFetch.apply(this, args)
      .then(response => {
        // Log event API calls
        if (resource.includes('/events/') && !resource.includes('/participants/')) {
          console.log('🔵 EVENT API CALL', {
            url: resource,
            hasAuthToken: !!(config?.headers?.Authorization),
            status: response.status
          });

          // Clone response to read body
          const clone = response.clone();
          clone.json().then(data => {
            console.log('📦 EVENT API RESPONSE', {
              eventId: data.id,
              userStatus: data.user_status,
              hasUserStatus: !!data.user_status,
              paymentPending: data.user_status?.payment_pending,
              originStatus: data.user_status?.origin_status,
              origins: data.user_status?.origins,
            });
          }).catch(err => {
            console.error('Failed to parse response', err);
          });
        }

        return response;
      })
      .catch(error => {
        console.error('❌ Fetch error:', error);
        throw error;
      });
  };

  console.log('✅ API Debug logging enabled. Watch console for EVENT API calls.');
}

// Export as component that activates logging on mount
export default function APIDebugLogger() {
  React.useEffect(() => {
    setupAPIDebugLogging();
  }, []);

  return null; // Invisible component
}
