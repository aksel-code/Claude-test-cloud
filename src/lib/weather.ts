/**
 * Weather for the daily stamp.
 *
 * This is the app's only network request, it is off by default, and it needs
 * the user to grant geolocation. Open-Meteo is used because it needs no API key
 * and therefore no proxy holding a secret — nothing about the user is sent
 * anywhere except a coarse latitude/longitude, and only when they ask for it.
 *
 * Every failure path is silent: no weather is a perfectly fine page.
 */

export interface Weather {
  label: string
  temperatureC: number
  /** Sticker id in the `nature` pack that matches, when one does. */
  sticker: string | null
}

const WMO: Record<number, { label: string; sticker: string | null }> = {
  0: { label: 'Clear', sticker: 'sun' },
  1: { label: 'Mostly clear', sticker: 'sun' },
  2: { label: 'Part cloud', sticker: 'cloud' },
  3: { label: 'Overcast', sticker: 'cloud' },
  45: { label: 'Fog', sticker: 'cloud' },
  48: { label: 'Fog', sticker: 'cloud' },
  51: { label: 'Drizzle', sticker: 'cloud' },
  53: { label: 'Drizzle', sticker: 'cloud' },
  55: { label: 'Drizzle', sticker: 'cloud' },
  61: { label: 'Rain', sticker: 'cloud' },
  63: { label: 'Rain', sticker: 'cloud' },
  65: { label: 'Heavy rain', sticker: 'cloud' },
  71: { label: 'Snow', sticker: 'cloud' },
  73: { label: 'Snow', sticker: 'cloud' },
  75: { label: 'Heavy snow', sticker: 'cloud' },
  80: { label: 'Showers', sticker: 'cloud' },
  81: { label: 'Showers', sticker: 'cloud' },
  82: { label: 'Showers', sticker: 'cloud' },
  95: { label: 'Thunderstorm', sticker: 'cloud' },
  96: { label: 'Thunderstorm', sticker: 'cloud' },
  99: { label: 'Thunderstorm', sticker: 'cloud' },
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('No geolocation')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 30 * 60 * 1000,
      enableHighAccuracy: false,
    })
  })
}

export async function currentWeather(): Promise<Weather | null> {
  try {
    const where = await position()
    // Two decimal places is roughly a kilometre — enough for weather, and not
    // a precise location.
    const lat = where.coords.latitude.toFixed(2)
    const lon = where.coords.longitude.toFixed(2)

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!response.ok) return null

    const data = await response.json() as {
      current?: { temperature_2m?: number; weather_code?: number }
    }
    const code = data.current?.weather_code
    const temp = data.current?.temperature_2m
    if (code === undefined || temp === undefined) return null

    const match = WMO[code] ?? { label: 'Weather', sticker: null }
    return {
      label: match.label,
      temperatureC: Math.round(temp),
      sticker: match.sticker,
    }
  } catch {
    // Offline, permission denied, timeout — all the same outcome: no weather.
    return null
  }
}
