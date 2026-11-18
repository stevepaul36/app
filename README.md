# Willowvale: Animal Town

A mobile-first 3D animal-town life-simulation prototype with original characters, browser gameplay, account registration, shared Socket.IO town events, and a reproducible Android debug APK workflow.

## Included

- Three.js town: Town Hearth, Willow Bridge, cottages, pond, market, garden plots, meadow restoration patches, original stylised animal neighbours and tractor.
- Activities: restore nature, plant and harvest, fish, sell goods, place cottages and greet neighbours.
- Touch and keyboard controls, responsive HUD, settings and day/night lighting.
- Username/password accounts with bcrypt password hashes, JWT sessions, rate-limited authentication, security headers and PostgreSQL persistence when DATABASE_URL is configured.
- Authenticated Socket.IO shared-town presence and event broadcasting.
- Capacitor Android wrapper and GitHub Actions APK artifact build.

## Local development

Requires Node.js 20+. PostgreSQL is needed for persistent accounts. Without DATABASE_URL, in-memory mode is enabled for local smoke testing only; data disappears when the server restarts.

    cp .env.example .env
    npm install
    npm start

Open http://localhost:3000. Create a nickname (3–20 letters, numbers or underscores) and password (8+ characters). Three.js is loaded from jsDelivr, so a network connection is required.

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
- Original characters are simple geometry, not polished rigged assets. Animations, sound, accessibility testing and device performance QA remain.
- Public child access requires legal/privacy review, reporting/moderation, data deletion and abuse protection.
