(function (root) {
  'use strict';

  const STORAGE_KEY = 'lawsuit-analytics-v1';
  const VISITOR_KEY = 'lawsuit-anonymous-visitor-v1';
  const SESSION_KEY = 'lawsuit-session-v1';
  const MAX_EVENTS = 5000;

  function uid(prefix) {
    if (root.crypto && root.crypto.randomUUID) return `${prefix}_${root.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function read(key, fallback) {
    try { return JSON.parse(root.localStorage.getItem(key) || '') || fallback; }
    catch (_) { return fallback; }
  }

  function visitorId() {
    let id = root.localStorage.getItem(VISITOR_KEY);
    if (!id) { id = uid('visitor'); root.localStorage.setItem(VISITOR_KEY, id); }
    return id;
  }

  function sessionId() {
    let session = read(SESSION_KEY, null);
    const now = Date.now();
    if (!session || now - session.lastSeen > 30 * 60 * 1000) session = { id: uid('session'), startedAt: now };
    session.lastSeen = now;
    root.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  }

  function clean(properties) {
    const safe = {};
    Object.entries(properties || {}).forEach(([key, value]) => {
      if (value == null || value === '') return;
      if (/name|phone|address|idnumber|identity|detail|answer|text/i.test(key)) return;
      safe[key] = Array.isArray(value) ? value.slice(0, 20) : value;
    });
    return safe;
  }

  function track(name, properties) {
    const events = read(STORAGE_KEY, []);
    events.push({
      eventId: uid('event'),
      event: name,
      occurredAt: new Date().toISOString(),
      visitorId: visitorId(),
      sessionId: sessionId(),
      version: '0.8beta',
      properties: clean(properties)
    });
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  }

  function events() { return read(STORAGE_KEY, []); }
  function replaceEvents(next) { root.localStorage.setItem(STORAGE_KEY, JSON.stringify((next || []).slice(-MAX_EVENTS))); }
  function clear() { root.localStorage.removeItem(STORAGE_KEY); }

  root.AppAnalytics = { STORAGE_KEY, track, events, replaceEvents, clear, visitorId, sessionId };
})(typeof window !== 'undefined' ? window : globalThis);
