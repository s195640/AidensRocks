async function handleTracking(client, data, rpsKey, fallbackTime) {
  try {
    const tracker = JSON.parse(data);
    await client.query(
      `
      INSERT INTO journey_tracking (
        rps_key, ip_address, user_agent, "window", screen,
        platform, language, timezone, timestamp, page_url,
        referrer, cookies_enabled, session_id, geo
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `,
      [
        rpsKey,
        tracker.ipAddress || null,
        tracker.userAgent || null,
        JSON.stringify(tracker.window || {}),
        JSON.stringify(tracker.screen || {}),
        tracker.platform || null,
        tracker.language || null,
        tracker.timezone || null,
        tracker.timestamp || fallbackTime,
        tracker.pageUrl || null,
        tracker.referrer || null,
        tracker.cookiesEnabled ?? null,
        tracker.sessionId || null,
        tracker.geo ? JSON.stringify(tracker.geo) : null,
      ]
    );

    return JSON.stringify(tracker, null, 2);
  } catch (e) {
    console.warn('Invalid trackerData:', e);
    return 'Invalid tracker data';
  }
}

module.exports = handleTracking;
