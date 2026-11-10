export type Fix = { lat: number; lng: number; accuracy: number };

// Asks the phone or browser where it is. Runs in the browser only.
export function getPosition(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This browser cannot share your location."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 }
    );
  });
}

export function locationErrorMessage(e: unknown): string {
  if (typeof GeolocationPositionError !== "undefined" && e instanceof GeolocationPositionError) {
    if (e.code === e.PERMISSION_DENIED) {
      return "Location is blocked. Allow location for this site in your browser settings, then try again.";
    }
    if (e.code === e.POSITION_UNAVAILABLE) return "Your location could not be found. Turn on GPS or step outside, then try again.";
    return "Finding your location took too long. Try again.";
  }
  return e instanceof Error ? e.message : "Something went wrong";
}
