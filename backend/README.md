## Doppler Secrets Management

This project supports [Doppler](https://doppler.com/) for secure environment variable management.

### Setup

1. [Install Doppler CLI](https://docs.doppler.com/docs/install-cli)
2. Log in: `doppler login`
3. Link your project: `doppler setup`
4. Add secrets via Doppler dashboard or CLI (see `.env.doppler.example` for required keys)

### Local Development

Run the backend with Doppler-managed secrets:

```bash
doppler run -- npm run dev
```

Or for production:

```bash
doppler run -- npm start
```

### Notes

- Doppler will inject secrets as environment variables at runtime.
- You can use Doppler for both backend and frontend (see Doppler docs for Next.js integration).
- The provided `.env.doppler.example` lists all required keys for Doppler config.
