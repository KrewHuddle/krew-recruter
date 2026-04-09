/**
 * Talent Pool Service
 *
 * Handles upserting applicants into the searchable talent pool,
 * geocoding addresses, and talent search queries.
 */

import { db } from "../db";
import { talentPool, talentPoolApplications } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface UpsertTalentData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  state?: string;
  jobTitle: string;
  userId?: string;
  resumeUrl?: string;
  source?: "job_application" | "direct_signup" | "gig_application";
}

/**
 * Upsert an applicant into the talent pool.
 * If they already exist (by email), update their record and add the new job title.
 * If new, create a fresh talent pool record.
 */
export async function upsertToTalentPool(data: UpsertTalentData) {
  const existing = await db
    .select()
    .from(talentPool)
    .where(eq(talentPool.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    const record = existing[0];
    const currentTitles = record.jobTitles || [];
    const newTitles = currentTitles.includes(data.jobTitle)
      ? currentTitles
      : [...currentTitles, data.jobTitle];

    const updates: Record<string, any> = {
      lastActiveAt: new Date(),
      jobTitles: newTitles,
    };

    // Update fields if they were previously empty
    if (!record.phone && data.phone) updates.phone = data.phone;
    if (!record.city && data.city) updates.city = data.city;
    if (!record.state && data.state) updates.state = data.state;
    if (!record.userId && data.userId) updates.userId = data.userId;
    if (!record.resumeUrl && data.resumeUrl) updates.resumeUrl = data.resumeUrl;

    // Geocode if we have city/state but no lat/lng
    if ((data.city || record.city) && !record.lat) {
      const coords = await geocodeAddress(`${data.city || record.city}, ${data.state || record.state}`);
      if (coords) {
        updates.lat = String(coords.lat);
        updates.lng = String(coords.lng);
      }
    }

    await db
      .update(talentPool)
      .set(updates)
      .where(eq(talentPool.id, record.id));

    return record.id;
  } else {
    // New talent record
    let lat: string | undefined;
    let lng: string | undefined;

    if (data.city && data.state) {
      const coords = await geocodeAddress(`${data.city}, ${data.state}`);
      if (coords) {
        lat = String(coords.lat);
        lng = String(coords.lng);
      }
    }

    const [record] = await db
      .insert(talentPool)
      .values({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        city: data.city || null,
        state: data.state || null,
        lat: lat || null,
        lng: lng || null,
        jobTitles: [data.jobTitle],
        userId: data.userId || null,
        resumeUrl: data.resumeUrl || null,
        source: data.source || "job_application",
      })
      .returning();

    return record.id;
  }
}

/**
 * Record a talent pool application junction entry.
 */
export async function recordTalentApplication(
  talentId: string,
  jobId: string,
  orgId: string
) {
  await db.insert(talentPoolApplications).values({
    talentId,
    jobId,
    orgId,
  });
}

// ============ Geocoding ============

interface GeoResult {
  lat: number;
  lng: number;
}

// Simple in-memory cache to avoid hammering Nominatim
const geocodeCache = new Map<string, GeoResult | null>();

/**
 * Geocode an address using OpenStreetMap Nominatim (free, no API key).
 * Rate-limited to 1 req/sec by Nominatim policy.
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!address.trim()) return null;

  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }

  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "KrewRecruiter/1.0 (support@krewhuddle.com)",
        },
      }
    );

    if (!res.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }

    geocodeCache.set(cacheKey, null);
    return null;
  } catch {
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Determine smart ad targeting radius based on population density.
 * Uses a simple heuristic based on known metro areas.
 */
export function getSmartRadius(city: string, state: string): number {
  const location = `${city}, ${state}`.toLowerCase();

  // Major metros (pop > 500k)
  const majorMetros = [
    "new york", "los angeles", "chicago", "houston", "phoenix",
    "philadelphia", "san antonio", "san diego", "dallas", "san jose",
    "austin", "jacksonville", "san francisco", "columbus", "charlotte",
    "indianapolis", "seattle", "denver", "washington", "nashville",
    "oklahoma city", "el paso", "boston", "portland", "las vegas",
    "memphis", "louisville", "baltimore", "milwaukee", "albuquerque",
    "tucson", "fresno", "sacramento", "mesa", "atlanta", "miami",
    "minneapolis", "new orleans", "cleveland", "tampa", "st. louis",
    "pittsburgh", "cincinnati", "orlando", "raleigh",
  ];

  // Mid-size cities (pop 100k-500k)
  const midSize = [
    "richmond", "boise", "des moines", "spokane", "tacoma",
    "fayetteville", "chattanooga", "savannah", "fort wayne",
    "tallahassee", "charleston", "wilmington", "dayton", "columbia",
    "waco", "springfield", "lakewood", "topeka", "brownsville",
    "aurora", "peoria", "overland park", "garden grove", "corona",
  ];

  for (const metro of majorMetros) {
    if (location.includes(metro)) return 15;
  }
  for (const mid of midSize) {
    if (location.includes(mid)) return 20;
  }

  // Default: small city/suburb/rural
  return 30;
}
