/**
 * Cloudflare Worker — Gemini API Proxy + Prayer Notification Push Server
 */

import { sendWebPush } from './webpush.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://azizul-hoq-maruf.github.io',
  'https://lifesync-f26.pages.dev',
  'http://localhost:3000',
  'http://localhost:3001',
];

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

function corsHeaders(origin) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status ?? 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function roundCoord(n) {
  return Math.round(n * 100) / 100;
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Returns today's date as "DD-MM-YYYY" in the given IANA timezone.
function getTodayDateStr(timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone ?? 'UTC',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(new Date());
  const d = parts.find(p => p.type === 'day').value;
  const m = parts.find(p => p.type === 'month').value;
  const y = parts.find(p => p.type === 'year').value;
  return `${d}-${m}-${y}`;
}

// Returns current time as total minutes since midnight in the given IANA timezone.
function getMinutesInTimezone(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone ?? 'UTC',
    hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour').value, 10) % 24;
  const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// Prayer times — KV-cached Aladhan fetch
// Cache key: prayer:{roundedLat}:{roundedLon}:{DD-MM-YYYY}:{method}
// TTL: 90000 s (~25 h) to survive DST edge cases
// ---------------------------------------------------------------------------

async function getPrayerTimings(lat, lon, method, timezone, env) {
  const dateStr = getTodayDateStr(timezone);
  const cacheKey = `prayer:${roundCoord(lat)}:${roundCoord(lon)}:${dateStr}:${method}`;

  const cached = await env.PRAYER_CACHE.get(cacheKey, { type: 'json' });
  if (cached) return cached;

  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=${method}`
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (json.code !== 200) return null;

  const timings = {};
  for (const [key, val] of Object.entries(json.data.timings)) {
    timings[key] = val.split(' ')[0]; // strip " (EST)" suffix Aladhan sometimes appends
  }

  await env.PRAYER_CACHE.put(cacheKey, JSON.stringify(timings), { expirationTtl: 90000 });
  return timings;
}

// ---------------------------------------------------------------------------
// Cron handler — task push notifications
// ---------------------------------------------------------------------------

async function handleTaskScheduled(env) {
  const vapidKeys = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };

  const allKeys = [];
  let cursor;
  do {
    const result = await env.PRAYER_SUBS.list({ prefix: 'tasks:', cursor, limit: 1000 });
    allKeys.push(...result.keys);
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  console.log(`handleTaskScheduled: VAPID_PUBLIC_KEY prefix=${env.VAPID_PUBLIC_KEY?.slice(0, 20)}`);
  console.log(`handleTaskScheduled: found ${allKeys.length} subscription(s)`);
  if (allKeys.length === 0) return;

  await Promise.allSettled(
    allKeys.map(async ({ name }) => {
      const data = await env.PRAYER_SUBS.get(name, { type: 'json' });
      if (!data) return;
      const { subscription, tasks } = data;
      const now = Date.now();
      const endpointHash = await sha256Hex(subscription.endpoint);

      console.log(`processing ${tasks.length} task(s) for ${name}`);
      for (const task of tasks) {
        const dueMs = new Date(task.dueDate).getTime();
        const diffMs = now - dueMs;
        console.log(`task [${task.id}] "${task.title}" dueDate=${task.dueDate} diffMin=${(diffMs/60000).toFixed(1)}`);
        // Window: [0, 11 min] after due time (matches 10-min cron + 1 min grace)
        if (diffMs < 0 || diffMs > 11 * 60 * 1000) continue;

        const dedupKey = `tasksent:${endpointHash.slice(0, 16)}:${task.id}`;
        if (await env.PRAYER_SUBS.get(dedupKey)) continue;
        await env.PRAYER_SUBS.put(dedupKey, '1', { expirationTtl: 900 });

        try {
          const resp = await sendWebPush(
            subscription,
            { title: 'Task Due', body: task.title, icon: './icon-192.png', badge: './icon-192.png' },
            vapidKeys
          );
          const respText = await resp.text();
          console.log(`task push [${task.id}] status=${resp.status} body=${respText}`);
          if (resp.status === 410 || resp.status === 404) {
            await env.PRAYER_SUBS.delete(name);
          }
        } catch (err) {
          console.error(`task push failed for ${task.id}:`, err.message);
        }
      }
    })
  );
}

// ---------------------------------------------------------------------------
// Cron handler — prayer push notifications
// ---------------------------------------------------------------------------

async function handleScheduled(env) {
  const vapidKeys = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };

  // Paginate KV list to handle >1000 subscriptions
  const allKeys = [];
  let cursor;
  do {
    const result = await env.PRAYER_SUBS.list({ prefix: 'sub:', cursor, limit: 1000 });
    allKeys.push(...result.keys);
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  if (allKeys.length === 0) return;

  await Promise.allSettled(
    allKeys.map(async ({ name }) => {
      const subData = await env.PRAYER_SUBS.get(name, { type: 'json' });
      if (!subData) return;

      const { subscription, lat, lon, method, timezone } = subData;
      const tz = timezone ?? 'UTC';

      const timings = await getPrayerTimings(lat, lon, method ?? 3, tz, env);
      if (!timings) return;

      const nowMinutes = getMinutesInTimezone(tz);
      const dateStr = getTodayDateStr(tz);
      const endpointHash = await sha256Hex(subscription.endpoint);

      for (const prayerName of PRAYER_NAMES) {
        const timeStr = timings[prayerName];
        if (!timeStr) continue;

        const [hh, mm] = timeStr.split(':').map(Number);
        const diff = nowMinutes - (hh * 60 + mm);

        // Window: [0, 11] min after prayer start (10 min cron interval + 1 min grace)
        if (diff < 0 || diff > 11) continue;

        // Dedup key — expires after 15 min so subsequent cron runs skip it
        const dedupKey = `sent:${endpointHash.slice(0, 16)}:${prayerName}:${dateStr}`;
        if (await env.PRAYER_SUBS.get(dedupKey)) continue;
        await env.PRAYER_SUBS.put(dedupKey, '1', { expirationTtl: 900 });

        try {
          const resp = await sendWebPush(
            subscription,
            {
              title: `${prayerName} Time`,
              body: `It is time for ${prayerName} (${timeStr}).`,
              icon: './icon-192.png',
              badge: './icon-192.png',
            },
            vapidKeys
          );
          // Subscription expired — remove from KV to keep storage clean
          if (resp.status === 410 || resp.status === 404) {
            await env.PRAYER_SUBS.delete(name);
          }
        } catch (err) {
          console.error(`sendWebPush failed for ${prayerName}:`, err.message);
        }
      }
    })
  );
}

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const { pathname } = new URL(request.url);

    // GET /vapid-public-key
    if (request.method === 'GET' && pathname === '/vapid-public-key') {
      return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY }, 200, origin);
    }

    // POST /subscribe
    if (request.method === 'POST' && pathname === '/subscribe') {
      try {
        const { subscription, lat, lon, method, timezone } = await request.json();
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
          return jsonResponse({ error: 'Invalid subscription object' }, 400, origin);
        }
        if (typeof lat !== 'number' || typeof lon !== 'number') {
          return jsonResponse({ error: 'lat and lon must be numbers' }, 400, origin);
        }
        const hash = await sha256Hex(subscription.endpoint);
        await env.PRAYER_SUBS.put(
          `sub:${hash}`,
          JSON.stringify({ subscription, lat, lon, method: method ?? 3, timezone: timezone ?? 'UTC', createdAt: new Date().toISOString() })
        );
        return jsonResponse({ ok: true }, 200, origin);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, origin);
      }
    }

    // DELETE /unsubscribe
    if (request.method === 'DELETE' && pathname === '/unsubscribe') {
      try {
        const { endpoint } = await request.json();
        if (!endpoint) return jsonResponse({ error: 'Missing endpoint' }, 400, origin);
        const hash = await sha256Hex(endpoint);
        await env.PRAYER_SUBS.delete(`sub:${hash}`);
        return jsonResponse({ ok: true }, 200, origin);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, origin);
      }
    }

    // POST /sync-tasks
    if (request.method === 'POST' && pathname === '/sync-tasks') {
      try {
        const { subscription, tasks } = await request.json();
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
          return jsonResponse({ error: 'Invalid subscription object' }, 400, origin);
        }
        if (!Array.isArray(tasks)) {
          return jsonResponse({ error: 'tasks must be an array' }, 400, origin);
        }
        const hash = await sha256Hex(subscription.endpoint);
        await env.PRAYER_SUBS.put(
          `tasks:${hash}`,
          JSON.stringify({ subscription, tasks, updatedAt: new Date().toISOString() })
        );
        return jsonResponse({ ok: true }, 200, origin);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, origin);
      }
    }

    // DELETE /sync-tasks
    if (request.method === 'DELETE' && pathname === '/sync-tasks') {
      try {
        const { endpoint } = await request.json();
        if (!endpoint) return jsonResponse({ error: 'Missing endpoint' }, 400, origin);
        const hash = await sha256Hex(endpoint);
        await env.PRAYER_SUBS.delete(`tasks:${hash}`);
        return jsonResponse({ ok: true }, 200, origin);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, origin);
      }
    }

    // All other POSTs → Gemini proxy (unchanged from original)
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await geminiResponse.json();
      return new Response(JSON.stringify(data), {
        status: geminiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        },
      });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.allSettled([handleScheduled(env), handleTaskScheduled(env)]));
  },
};
