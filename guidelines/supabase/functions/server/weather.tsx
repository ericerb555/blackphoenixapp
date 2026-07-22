/**
 * weather — real weather backing WeatherJobSiteMonitor.tsx.
 *
 * Replaces the previous Math.random() fake weather with genuine data from
 * Open-Meteo (https://open-meteo.com), a free forecast API that requires no key.
 * Given a job site's latitude/longitude it returns current conditions plus a
 * 7-day forecast, mapped into the shape the frontend already expects.
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";

const weatherRouter = new Hono();
const PREFIX = "/make-server-57095a78";

weatherRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
  credentials: false,
}));

// Map WMO weather codes (Open-Meteo) to the frontend's condition vocabulary.
function conditionFromCode(code: number): { condition: string; description: string } {
  if (code === 0) return { condition: "clear", description: "clear sky" };
  if (code === 1) return { condition: "clear", description: "mainly clear" };
  if (code === 2) return { condition: "clouds", description: "partly cloudy" };
  if (code === 3) return { condition: "clouds", description: "overcast" };
  if (code === 45 || code === 48) return { condition: "clouds", description: "fog" };
  if (code >= 51 && code <= 57) return { condition: "drizzle", description: "drizzle" };
  if (code >= 61 && code <= 67) return { condition: "rain", description: "rain" };
  if (code >= 71 && code <= 77) return { condition: "snow", description: "snow" };
  if (code >= 80 && code <= 82) return { condition: "rain", description: "rain showers" };
  if (code >= 85 && code <= 86) return { condition: "snow", description: "snow showers" };
  if (code >= 95) return { condition: "rain", description: "thunderstorm" };
  return { condition: "clouds", description: "unknown" };
}

// Rough workable-hours estimate for a construction crew given a forecast day.
function workableHours(precipProb: number, windMax: number, code: number): number {
  let hours = 10;
  if (precipProb >= 70) hours -= 4;
  else if (precipProb >= 40) hours -= 2;
  if (windMax >= 30) hours -= 2;
  if (code >= 95) hours -= 4; // thunderstorms
  return Math.max(0, hours);
}

weatherRouter.post(`${PREFIX}/weather/site`, async (c) => {
  try {
    const body = await c.req.json();
    const { siteId, siteName, latitude, longitude } = body;
    if (latitude == null || longitude == null) {
      return c.json({ success: false, error: "latitude and longitude are required" }, 400);
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility",
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max",
    );
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("precipitation_unit", "inch");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "7");

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Open-Meteo request failed (${res.status}): ${errText}`);
    }
    const data = await res.json();

    const cur = data.current || {};
    const curCond = conditionFromCode(cur.weather_code ?? 3);
    const daily = data.daily || {};
    const days: string[] = daily.time || [];

    const forecast = days.map((date: string, i: number) => {
      const code = daily.weather_code?.[i] ?? 3;
      const precipProb = daily.precipitation_probability_max?.[i] ?? 0;
      const windMax = daily.wind_speed_10m_max?.[i] ?? 0;
      return {
        date,
        high: Math.round(daily.temperature_2m_max?.[i] ?? 0),
        low: Math.round(daily.temperature_2m_min?.[i] ?? 0),
        condition: conditionFromCode(code).condition,
        precipChance: Math.round(precipProb),
        precipAmount: daily.precipitation_sum?.[i] ?? 0,
        windSpeed: Math.round(windMax),
        workableHours: workableHours(precipProb, windMax, code),
      };
    });

    const weather = {
      siteId,
      siteName,
      current: {
        temp: Math.round(cur.temperature_2m ?? 0),
        feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
        condition: curCond.condition,
        description: curCond.description,
        humidity: Math.round(cur.relative_humidity_2m ?? 0),
        windSpeed: Math.round(cur.wind_speed_10m ?? 0),
        windDirection: Math.round(cur.wind_direction_10m ?? 0),
        precipitation: cur.precipitation ?? 0,
        // Open-Meteo reports visibility in metres; convert to miles.
        visibility: cur.visibility != null ? Math.round((cur.visibility / 1609.34) * 10) / 10 : 10,
        uvIndex: Math.round(daily.uv_index_max?.[0] ?? 0),
        timestamp: cur.time ? new Date(cur.time).toISOString() : new Date().toISOString(),
      },
      forecast,
      alerts: [],
    };

    return c.json({ success: true, weather });
  } catch (error) {
    console.error("[Weather] Error fetching site weather:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default weatherRouter;
