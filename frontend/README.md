# Uber Video Frontend

React single-page app built with Vite. It provides user and captain sign-in,
ride booking, captain ride management, live updates, and location tracking.

See the [root README](../README.md) for full project setup and the
[backend guide](../backend/README.md) for API and Socket.IO details.

## Requirements and setup

You need Node.js and pnpm. From this directory, create the local environment
file, install dependencies, and start Vite:

```sh
cp frontend_env_example.txt .env
pnpm install
pnpm dev
```

Vite prints the development URL when it starts, usually
`http://localhost:5173`. The backend must also be running for login, address
search, fare estimates, and ride requests.

## Environment variables

| Variable | Description |
| --- | --- |
| `VITE_BASE_URL` | Backend URL for API requests and Socket.IO. |
| `VITE_API_URL` | Backend URL used by the logout pages. |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional Google map key. |

For local development, both backend URL values should be
`http://localhost:3000`. The map uses Leaflet as a fallback when the Google
Maps key is empty or fails to authenticate. Address search and fare estimates
still need the backend's Geoapify key.

The older tutorial used Google Places for address suggestions. Google Maps
now offers a testing-only [Maps Demo Key][maps-demo-key] with limited
features and daily quotas, plus a newer Places API flow. The old setup may not
work with a demo key or mismatched API configuration. Autocomplete itself
has not been removed. This app gets address suggestions, geocoding, and route
estimates from the backend's Geoapify integration. Configure
`GEOAPIFY_API_KEY` in the backend `.env`. The Google key is only for the
optional browser map.

Vite exposes `VITE_` variables to browser code. Do not put private server
credentials in this file. Values are substituted into the compiled JavaScript
in `dist`, so they are visible to anyone who can load the site. This remains
true when GitHub Actions uses a repository secret to build a GitHub Pages
deployment: the secret can still be embedded in the generated bundle.

If you need the Google Maps key to stay out of `dist`, leave
`VITE_GOOGLE_MAPS_API_KEY` unset and use the Leaflet fallback. If you use a
browser Maps key, treat it as public and restrict it in Google Cloud by HTTP
referrer and to the required APIs. Keep Geoapify, MongoDB, and other server
credentials in the backend environment only.

## Docker

Run commands from the repository root. Build the frontend image with Compose:

```sh
docker compose build frontend
```

Start the frontend and its backend/database dependencies, then follow its
logs:

```sh
docker compose up -d frontend
docker compose logs -f frontend
```

You can also build the image directly. The API URLs are compiled into the
static frontend bundle, so pass the backend URL as build arguments:

```sh
docker build \
  --build-arg VITE_BASE_URL=http://localhost:3000 \
  --build-arg VITE_API_URL=http://localhost:3000 \
  -t uber-video-frontend ./frontend
```

Docker builds leave `VITE_GOOGLE_MAPS_API_KEY` unset, so the app uses the
Leaflet fallback. The Dockerfile does not accept a Maps key build argument.
For local Vite development, the optional browser key can still be set in
`.env`; it will be included in any frontend bundle built with that value, so
restrict it in Google Cloud before use.

Run the built frontend image with:

```sh
docker run --rm -p 5173:80 uber-video-frontend
```

## Available commands

Run these from `frontend/`:

```sh
pnpm dev
pnpm lint
pnpm build
pnpm preview
```

## Main routes

| Path | Page |
| --- | --- |
| `/` | Start page |
| `/login` | User sign-in |
| `/signup` | User registration |
| `/home` | User ride booking; requires login |
| `/riding` | Active user ride |
| `/captain-login` | Captain sign-in |
| `/captain-signup` | Captain registration |
| `/captain-home` | Captain dashboard; requires login |
| `/captain-riding` | Active captain ride |

## Source layout

- `src/pages/` contains routed screens and protected route wrappers.
- `src/components/` contains ride panels, forms, and map components.
- `src/context/` contains account and socket contexts.
- `src/styles.css` contains global application styles.
- `public/` contains static assets.

[maps-demo-key]: https://developers.google.com/maps/demo-key
