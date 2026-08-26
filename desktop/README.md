# SpecForge Studio for Windows

SpecForge Studio for Windows is a thin Electron shell around the hosted SpecForge dashboard. It uses the same web application, authentication session, backend API, and SQLite source of truth; it does not create a second local workspace database.

## Development

From the repository root:

```powershell
bun install
$env:SPECFORGE_APP_URL = "http://localhost:5173"
bun run desktop:dev
```

For a packaged build, write `desktop/config/app-config.json` with a real deployed origin:

```json
{
  "appUrl": "https://studio.example.com"
}
```

Never ship the example placeholder URL. The application rejects non-HTTP(S) origins and opens external links in the system browser.

## Distribution builds

The root scripts are:

```powershell
bun run desktop:dist:dir
bun run desktop:dist
```

`desktop:dist:dir` creates an unpacked Windows directory for smoke testing. `desktop:dist` creates the NSIS installer and portable executable in `desktop/release/`.

Tagged releases are built by `.github/workflows/windows-desktop.yml`. Configure the repository variable `SPECFORGE_APP_URL` before dispatching the workflow or pushing a `v*` tag. Tagged releases additionally require these repository secrets:

- `WIN_CSC_LINK`: base64-encoded or hosted Authenticode certificate reference accepted by electron-builder.
- `WIN_CSC_KEY_PASSWORD`: password for the certificate.

The workflow maps these to electron-builder’s `CSC_LINK` and `CSC_KEY_PASSWORD` variables. Manual non-tag builds can be used for unsigned QA artifacts, but public downloads must use a signed release.

## Landing-page download

Set the frontend build variable to the published installer asset, for example:

```text
VITE_WINDOWS_DOWNLOAD_URL=https://github.com/your-org/specforge-studio/releases/download/v0.1.0/SpecForge-Studio-0.1.0-win-x64.exe
```

The landing page intentionally shows a release-preparing state when this value is empty. Rebuild and redeploy the frontend after publishing a new installer asset.

## Release checklist

1. Deploy the web application and set `SPECFORGE_APP_URL` to its HTTPS origin.
2. Configure the production `ADMIN_EMAILS` value and verify the operator account.
3. Configure the backend backup schedule and confirm `backups/last-backup.json` is fresh.
4. Configure the Authenticode certificate secrets in the repository.
5. Push a version tag and confirm NSIS and portable artifacts are produced.
6. Verify the installer on a clean Windows machine.
7. Set `VITE_WINDOWS_DOWNLOAD_URL` to the published signed asset and redeploy the landing page.
