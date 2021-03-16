# dice-roller
App to simulate dice rolls and save your common rolls. Uses true random with fallback to pseudorandom.

### Environment Variables
- `PORT` - Port to run the server on.
- `RANDOMORG_API_KEY` - API key for Random.org.
- `INITIAL_ADMIN` - Email for the initial admin.
- `INITIAL_PASSWORD` - Password for the initial admin. Password reset will be required after first login.
- PostgreSQL uses its default environment variables `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
- Tests use a test database via `TEST_PGHOST`, `TEST_PGPORT`, `TEST_PGDATABASE`, `TEST_PGUSER`, `TEST_PGPASSWORD`.
