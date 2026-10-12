import { validateTailnetUrl } from './config';

describe('Tailscale service address validation', () => {
  it('accepts an HTTPS tailnet DNS name', () => {
    expect(validateTailnetUrl('https://computer.example.ts.net/')).toBe(
      'https://computer.example.ts.net',
    );
  });

  it.each([
    'https://100.100.10.20',
    'https://[fd7a:115c:a1e0::1]',
  ])('accepts a Tailscale IP address %s', (address) => {
    expect(validateTailnetUrl(address)).toBe(address);
  });

  it.each([
    'https://public.example.com',
    'https://user@computer.example.ts.net',
    'http://computer.example.ts.net',
    'not-a-url',
  ])('rejects non-tailnet or insecure address %s', (address) => {
    expect(() => validateTailnetUrl(address)).toThrow();
  });
});
