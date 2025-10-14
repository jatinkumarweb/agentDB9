/**
 * Fetch wrapper that prevents DNS caching issues in Docker environments
 * 
 * Node.js's fetch (undici) caches DNS lookups, which can cause issues when
 * Docker containers restart and get new IP addresses. This wrapper forces
 * fresh DNS resolution by using the 'lookup' option with dns.lookup.
 */

import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

// Cache for resolved IPs with short TTL (5 seconds)
const dnsCache = new Map<string, { ip: string; timestamp: number }>();
const DNS_CACHE_TTL = 5000; // 5 seconds

/**
 * Resolve hostname to IP with short-lived caching
 */
async function resolveHostname(hostname: string): Promise<string> {
  const now = Date.now();
  const cached = dnsCache.get(hostname);
  
  // Use cached IP if it's fresh (less than 5 seconds old)
  if (cached && (now - cached.timestamp) < DNS_CACHE_TTL) {
    return cached.ip;
  }
  
  // Perform fresh DNS lookup
  try {
    const result = await lookup(hostname, { family: 4 }); // IPv4 only
    const ip = result.address;
    
    // Cache the result
    dnsCache.set(hostname, { ip, timestamp: now });
    
    // Clean up old entries
    for (const [key, value] of dnsCache.entries()) {
      if (now - value.timestamp > DNS_CACHE_TTL) {
        dnsCache.delete(key);
      }
    }
    
    return ip;
  } catch (error) {
    console.error(`DNS lookup failed for ${hostname}:`, error);
    throw error;
  }
}

/**
 * Fetch with fresh DNS resolution
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function fetchNoCache(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  const urlObj = new URL(url);
  
  // For Docker service names, resolve to IP to bypass Node.js DNS cache
  if (urlObj.hostname !== 'localhost' && !urlObj.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    try {
      const ip = await resolveHostname(urlObj.hostname);
      console.log(`DNS: Resolved ${urlObj.hostname} -> ${ip}`);
      
      // Replace hostname with IP but keep Host header
      const ipUrl = new URL(urlObj.toString());
      ipUrl.hostname = ip;
      
      return fetch(ipUrl.toString(), {
        ...options,
        headers: {
          'Host': urlObj.hostname, // Preserve original hostname in Host header
          ...options?.headers,
        },
      });
    } catch (error) {
      console.warn(`DNS resolution failed for ${urlObj.hostname}, falling back to standard fetch:`, error);
    }
  }
  
  // Fallback to standard fetch
  return fetch(url, options);
}
