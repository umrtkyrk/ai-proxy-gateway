/**
 * Checks the Origin/Referer domain of the incoming request.
 * @param clientType Type of the client ('browser-based' or 'server-based')
 * @param allowedDomains List of allowed domains (e.g., ['example.com'])
 * @param originHeader The 'Origin' or 'Referer' header from the request
 */
export function checkDomainWhitelist(
  clientType: 'browser-based' | 'server-based',
  allowedDomains: string[],
  originHeader?: string | null
) {
  if (clientType === 'server-based') {
    return { success: true };
  }

  if (!originHeader) {
    return { 
      success: false, 
      status: 403, 
      error: 'CORS Error: Origin or Referer header is missing. Browser-based requests cannot be verified.' 
    };
  }

  try {
    const originUrl = new URL(originHeader);
    const hostname = originUrl.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { success: true };
    }

    const isAllowed = allowedDomains.some((domain) => {
      if (hostname === domain) return true;
      if (hostname.endsWith(`.${domain}`)) return true;
      return false;
    });

    if (isAllowed) {
      return { success: true };
    } else {
      return { 
        success: false, 
        status: 403, 
        error: `CORS Error: '${hostname}' is an unauthorized domain.` 
      };
    }
  } catch (error) {
    return { success: false, status: 400, error: 'Invalid Origin format' };
  }
}