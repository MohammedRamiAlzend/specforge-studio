# SpecForge Studio Operations

## Supported local deployment

The supported container topology is defined in `docker-compose.yml`. The frontend is exposed on port `8080`, the backend remains private to the Compose network, and the SQLite database plus generated exports live in the named `specforge_data` volume.

Create `backend/.env` from `backend/.env.example` and provide the SMTP values before starting the stack. Keep `AUTH_REQUIRED=true` and `AUTH_RATE_LIMIT_ENABLED=true` outside test fixtures. For a same-origin deployment through Nginx, `COOKIE_SECURE=false` is suitable only when TLS terminates elsewhere and the internal connection is trusted; for direct HTTPS cookie delivery, set `COOKIE_SECURE=true`.

```bash
cp backend/.env.example backend/.env
# edit backend/.env and provide SMTP credentials
docker compose up --build -d
curl http://localhost:8080/api/healthz
curl http://localhost:8080/api/readyz
```

## Database backup

Stop write traffic or run the checkpoint while the application is quiescent. SQLite backup must include the main database and account for WAL state. The following command uses the application container and writes the backup into the current directory:

```bash
docker compose exec backend bun -e "const db = new Bun.Database('/app/data/specforge.db'); db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close()"
docker compose cp backend:/app/data/specforge.db ./specforge-$(date +%Y%m%d-%H%M%S).db
```

## Restore

Stop the stack, replace the named-volume database with a verified backup, and run an integrity check before restart. Keep the original volume as a rollback copy until verification succeeds.

```bash
docker compose down
# copy the approved backup to the mounted volume as specforge.db
docker compose run --rm backend bun -e "const db = new Bun.Database('/app/data/specforge.db'); console.log(db.query('PRAGMA integrity_check').get()); db.close()"
docker compose up -d
```

## Migration and release checks

Migrations are additive and must be applied in numeric order. Before release, run `bun run typecheck`, `bun test backend/tests frontend/tests`, `bun run --cwd backend smoke`, and `bun run build`. The CI workflow runs those gates automatically. The readiness endpoint is the deployment gate; liveness only confirms that the process and SQLite connection respond.

## Troubleshooting

A `503` response from `/readyz` means required SMTP variables are missing from the backend environment. A `401` response from a product API is expected unless a verified user session is present. A `400` response stating that project scope is required indicates that secure mode received a project-owned request without a project identifier; use the route’s `project` query parameter or the documented project path.
