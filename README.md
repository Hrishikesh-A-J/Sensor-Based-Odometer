# Odometer live dashboard
1. Put the `server/` folder in a GitHub repo.
2. Render -> New Web Service -> that repo. Build: `npm install`, Start: `node server.js`. Add env var API_KEY = your secret.
3. Edit firmware.ino (WiFi, SERVER_URL, API_KEY, WHEEL_RADIUS_M), flash the ESP32.
4. Open the Render URL on laptop. Open it on your phone too and tap "Share this phone's location".
