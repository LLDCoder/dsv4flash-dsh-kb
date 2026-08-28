/**
 * Builds the coordinate half of a profile address payload.
 *
 * The backend reads these three ways, and the difference is invisible in the request
 * shape: omitting the keys keeps whatever pin is stored, an explicit null clears it,
 * and a value overwrites it. Both axes are also validated as a pair — sending one
 * alone is an HTTP 400, since the backend will not pad the missing axis from the
 * stored row and invent a spot the user never picked.
 *
 * So: emit what the form actually holds, independent of how the address was entered.
 * A user may pin a spot on the map and then correct the street text by hand; the pin
 * is still theirs. An incomplete or unparseable pair means "no pin" and is sent as an
 * explicit null, which is what clears a pin the user removed.
 */
export function buildCoordinateParams(values: {
  addressLatitude?: unknown;
  addressLongitude?: unknown;
}): { latitude: number | null; longitude: number | null } {
  const latitude = Number(values.addressLatitude);
  const longitude = Number(values.addressLongitude);
  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude);

  return {
    latitude: hasPin ? latitude : null,
    longitude: hasPin ? longitude : null,
  };
}
