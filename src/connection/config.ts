import * as SecureStore from 'expo-secure-store';

const HOST_KEY = 'fablego.serviceHost';
const TOKEN_KEY = 'fablego.serviceToken';

export interface ServiceConfig {
  baseUrl: string;
  token: string;
}

function isTailnetHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized.endsWith('.ts.net')) {
    return true;
  }
  if (normalized.startsWith('fd7a:115c:a1e0:')) {
    return true;
  }
  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) {
    return false;
  }
  const octets = ipv4.slice(1).map(Number);
  return octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127
    && octets.every((octet) => octet >= 0 && octet <= 255);
}

export function validateTailnetUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Enter a valid Tailscale HTTPS address');
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || !isTailnetHost(parsed.hostname)
  ) {
    throw new Error('Use an HTTPS Tailscale address ending in .ts.net or a Tailscale IP');
  }
  return parsed.toString().replace(/\/$/, '');
}

export async function getServiceConfig(): Promise<ServiceConfig | null> {
  const [baseUrl, token] = await Promise.all([
    SecureStore.getItemAsync(HOST_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
  ]);
  return baseUrl && token ? { baseUrl, token } : null;
}

export async function saveServiceConfig(baseUrl: string, token: string): Promise<void> {
  const validatedUrl = validateTailnetUrl(baseUrl);
  if (!token.trim()) {
    throw new Error('An authentication token is required');
  }
  await Promise.all([
    SecureStore.setItemAsync(HOST_KEY, validatedUrl),
    SecureStore.setItemAsync(TOKEN_KEY, token.trim()),
  ]);
}
