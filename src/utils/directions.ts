/**
 * Build a Google Maps multi-stop directions URL.
 * Format: https://www.google.com/maps/dir/address1/address2/...
 */
export function buildDirectionsUrl(addresses: string[]): string {
  if (addresses.length === 0) return '';
  const encoded = addresses.map((a) => encodeURIComponent(a));
  return `https://www.google.com/maps/dir/${encoded.join('/')}`;
}

/**
 * Split addresses into batches and return one directions URL per batch.
 * Google Maps handles ~10 waypoints well in URL format.
 */
export function buildDirectionsUrls(
  addresses: string[],
  maxPerBatch = 10,
): string[] {
  if (addresses.length === 0) return [];
  if (addresses.length <= maxPerBatch) return [buildDirectionsUrl(addresses)];
  const urls: string[] = [];
  for (let i = 0; i < addresses.length; i += maxPerBatch) {
    urls.push(buildDirectionsUrl(addresses.slice(i, i + maxPerBatch)));
  }
  return urls;
}
