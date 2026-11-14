// Fake ESP32 + fake phone GPS, to test the website with no hardware.
// Usage:  node simulate.js https://YOUR-APP.onrender.com [apikey]
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const key = process.argv[3] || '';
const headers = { 'Content-Type': 'application/json', 'x-api-key': key };
let total = 1234.5, trip = 0, lat = 18.5204, lon = 73.8567, t = 0;   // starts in Pune

setInterval(async () => {
  t++;
  const v = Math.max(0, 14 + 8 * Math.sin(t / 8) + (Math.random() - 0.5) * 2);   // km/h
  const d = v / 3.6;                                                              // metres in 1 s
  trip += d; total += d;
  lat += d * 0.7e-5; lon += d * 0.7e-5 * Math.sin(t / 20);                       // drifting route
  try {
    await fetch(base + '/api/ingest', { method: 'POST', headers, body: JSON.stringify({ v, total, trip, pulses: 0, reset: false }) });
    await fetch(base + '/api/location', { method: 'POST', headers, body: JSON.stringify({ lat, lon, acc: 5 }) });
    console.log(`v=${v.toFixed(1)} km/h  trip=${(trip / 1000).toFixed(3)} km`);
  } catch (e) { console.log('error:', e.message); }
}, 1000);
