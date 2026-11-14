const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const KEY = process.env.API_KEY || '';   // leave API_KEY unset on Render to run with no key
const MAX_LOG = 50000;
let log = [];          // {ts, v, total, trip, tripId}
let locs = [];         // {ts, lat, lon, acc, tripId}
let tripId = 1, resetPending = false, latest = null, latestLoc = null;
const clients = new Set();

const auth = (req, res, next) =>
  (!KEY || req.get('x-api-key') === KEY) ? next() : res.status(401).json({ error: 'bad key' });
app.get('/api/config', (req, res) => res.json({ needsKey: !!KEY }));

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
}

// ESP32 posts here once a second
app.post('/api/ingest', auth, (req, res) => {
  const { v, total, trip, pulses, reset } = req.body;
  if (reset) { tripId++; broadcast('reset', { tripId }); }   // physical button pressed on the cycle
  latest = { ts: Date.now(), v, total, trip, pulses, tripId };
  log.push(latest);
  if (log.length > MAX_LOG) log.shift();
  broadcast('data', latest);
  res.json({ ok: true, reset: resetPending });
  resetPending = false;
});

// Phone posts GPS fixes here
app.post('/api/location', auth, (req, res) => {
  const { lat, lon, acc } = req.body;
  latestLoc = { ts: Date.now(), lat, lon, acc, tripId };
  locs.push(latestLoc);
  if (locs.length > MAX_LOG) locs.shift();
  broadcast('loc', latestLoc);
  res.json({ ok: true });
});

// Dashboard button: start a new trip
app.post('/api/trip/reset', auth, (req, res) => {
  tripId++; resetPending = true;
  broadcast('reset', { tripId });
  res.json({ ok: true, tripId });
});

const snapshot = () => ({
  tripId, latest, latestLoc,
  log: log.filter(r => r.tripId === tripId).slice(-3600),
  locs: locs.filter(l => l.tripId === tripId),
});
app.get('/api/state', (req, res) => res.json(snapshot()));

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(`event: init\ndata: ${JSON.stringify(snapshot())}\n\n`);
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);   // keeps Render's proxy awake
  req.on('close', () => { clearInterval(ping); clients.delete(res); });
});

app.get('/api/log.csv', (req, res) => {
  const rows = ['time_iso,trip_id,speed_kmh,trip_m,total_m'].concat(
    log.map(r => `${new Date(r.ts).toISOString()},${r.tripId},${r.v},${r.trip},${r.total}`));
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=odometer_log.csv' });
  res.send(rows.join('\n'));
});

app.listen(process.env.PORT || 3000, () => console.log('running'));
