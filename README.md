# Willowvale: Animal Town

A mobile-first illustrated animal-town life-simulation prototype with original characters, browser gameplay, account registration, shared Socket.IO town events, and a reproducible Android debug APK workflow.

## Included

- Illustrated 2.5D island town drawn on a 2D canvas (no 3D library, no image downloads): four districts (Willow Park, Old Town, Bluewater Quay, Fernhill Heights), a town square, eight places to visit, twelve homes, the Sunwheel and the windmill.
- Twelve original animal neighbours who wander, react and can be befriended; choose your own animal and outfit.
- Daily activities at each place, a bag of items, neighbour gifts, friendship hearts and daily goals.
- Tap-to-walk with pathfinding, drag to pan, pinch or scroll to zoom, WASD/arrow keys on desktop. Phone-first layout with bottom sheets.
- Username/password accounts with bcrypt password hashes, JWT sessions, rate-limited authentication, security headers and PostgreSQL persistence when DATABASE_URL is configured.
- Authenticated Socket.IO shared-town presence and event broadcasting.
- Capacitor Android wrapper and GitHub Actions APK artifact build.

## Local development

Requires Node.js 20+. PostgreSQL is needed for persistent accounts. Without DATABASE_URL, in-memory mode is enabled for local smoke testing only; data disappears when the server restarts.

    cp .env.example .env
    npm install
    npm start

Open http://localhost:3000. Pick an animal and start exploring as a guest; guest progress is kept on the device. Creating an account (nickname of 3–20 letters, numbers or underscores and an 8+ character password) needs DATABASE_URL. The game code has no CDN dependencies, so it also runs offline inside the Android shell; the Google Fonts stylesheet is optional and falls back to system fonts.

Code layout: public/js/world.js (map, districts, homes, places, neighbours, pathfinding), public/js/art.js (all procedural art), public/app.js (engine, input and UI).

## Deploy to Render

1. Create a new Blueprint in Render using this repository and review the web service and PostgreSQL resources in render.yaml.
2. The Blueprint generates JWT_SECRET and connects DATABASE_URL.
3. Set ALLOWED_ORIGINS to your actual frontend origin(s).
4. Verify /healthz reports database connected and persistent mode.
5. Configure database backups, monitoring, privacy policy, account deletion, moderation, and age-appropriate consent before public launch.

## Android APK

GitHub Actions workflow .github/workflows/android-apk.yml generates a Capacitor Android shell, builds a debug APK, and uploads it as an artifact. Open GitHub Actions, select Android APK, open the latest successful run, and download the willowvale-debug-apk artifact.

This is a debug APK for testing, not a signed Play Store release. A signed release needs a protected Android signing keystore and GitHub secrets. Never commit keystores or passwords.

## Prototype limitations

- Live town events are broadcast through Socket.IO. The shared town's aggregate state is currently in memory, while per-player inventory and progress are stored in PostgreSQL. Multi-instance production deployment needs shared Redis/adapter and durable town-state storage.
- Client-side actions still need authoritative server validation and replay protection before launch. Do not treat this as a child-safe public production service yet.
- Characters and buildings are procedural vector art. Sound, real-device performance QA and further accessibility testing remain.
- Activity coins for signed-in players are shown locally but are not yet saved by the server (there is no server endpoint for activities yet).
- Public child access requires legal/privacy review, reporting/moderation, data deletion and abuse protection.
