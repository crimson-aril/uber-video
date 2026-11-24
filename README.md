# Uber Video

An Uber-style ride-booking app with separate user and captain experiences,
live ride updates, fare estimates, and location search.

## Features

1. User and captain registration, login, profiles, and logout.
2. Ride requests, fare estimates, captain acceptance, OTP start, and completion.
3. Live ride notifications through Socket.IO.
4. Address search and routing through Geoapify.
5. A Leaflet map with OpenStreetMap tiles and the user's current location.

## Why the app uses Geoapify

The older tutorial uses Google Places for address suggestions. Since it was
written, Google Maps Platform has added a no-cost [Maps Demo Key][maps-demo-key]
for testing with limited features and daily quotas. Google also has a newer
[Places API flow][places-api-docs]. The old setup may fail when its key or
API configuration does not match the current flow; autocomplete
itself has not been removed. Production Google Maps use requires a standard
key and the required API and billing setup.

This fork uses Geoapify in the backend for address suggestions, geocoding,
and route distance/time, which the ride fare calculation also needs. Set
`GEOAPIFY_API_KEY` in `backend/.env`. The app's default map is Leaflet with
OpenStreetMap tiles. The source also contains an optional Google Maps renderer,
but the Docker builds leave its browser key unset and use Leaflet.

See Google's [Places API documentation][places-api-docs] and
[Geoapify API key guidance][geoapify-keys].

Read the [backend guide](backend/README.md) for API details and the
[frontend guide](frontend/README.md) for UI setup and scripts.

## Requirements

- Node.js and pnpm.
- A MongoDB database, local or hosted.
- A Geoapify API key for address lookup, routing, and fare calculation.
- No Google Maps API key is needed for the default Leaflet map.

## must do this

```sh
git config core.ignorecase false # to tell Git to track filename capitalization changes
```

## Run locally

Start the backend in one terminal:

```sh
cd backend
cp backend_env_example.txt .env
pnpm install
pnpm start
```

Edit `backend/.env` and provide `DB_CONNECT`, `JWT_SECRET`, and
`GEOAPIFY_API_KEY`. The API listens on port `3000` by default.

Start the frontend in a second terminal:

```sh
cd frontend
cp frontend_env_example.txt .env
pnpm install
pnpm dev
```

The Vite development server prints its local URL, usually
`http://localhost:5173`. Set `VITE_BASE_URL` and `VITE_API_URL` in
`frontend/.env` to the backend URL. The map uses Leaflet and OpenStreetMap by
default; no browser map key is needed.

The example environment files contain local development values. Keep real
credentials in `.env` files and out of commits.

## Browser API keys and GitHub Pages

Every Vite variable prefixed with `VITE_` is public: Vite replaces it in the
frontend build, so its value can be read from `frontend/dist` and from the
deployed website's JavaScript. Putting a key in a GitHub Actions secret does
not keep it private if the workflow passes it to Vite during the build; the
resulting static files still contain it.

Do not put a Google Maps key in a `VITE_` variable or frontend build argument
if it must remain secret. To keep it out of `dist`, leave
`VITE_GOOGLE_MAPS_API_KEY` unset; this app will use the Leaflet fallback. If
you choose to use a browser Maps key, assume it is public and restrict it in
Google Cloud by website referrer and to only the APIs the app needs. Keep
server credentials such as MongoDB and Geoapify keys in backend environment
variables, never in frontend variables.

## Run with Docker Compose

Create `backend/.env` from the example and set `JWT_SECRET` and
`GEOAPIFY_API_KEY`:

```sh
cp backend/backend_env_example.txt backend/.env
```

Build both images and start the full stack from the repository root:

```sh
docker compose build backend frontend
docker compose up -d
docker compose ps
docker compose logs -f backend frontend
```

Open `http://localhost:5173` for the web app and
`http://localhost:3000` for the API. Compose starts MongoDB and stores its
data in a named volume. Run `docker compose down` to stop the containers.
Docker builds leave `VITE_GOOGLE_MAPS_API_KEY` unset, so the frontend uses the
Leaflet fallback.

## Deploy the backend on Render

Create a Render Web Service connected to this repository and choose the
Docker runtime. Leave **Root Directory** blank so Render uses the repository
root. Set **Dockerfile Path** to `backend/Dockerfile` and keep the Docker build
context at the repository root (`.`). This Dockerfile copies the repository
and reads the app from `backend/`, so setting the root directory to `backend`
would leave required paths outside the build context.

Add these environment variables in the Render service settings:

| Variable | Value |
| --- | --- |
| `DB_CONNECT` | Your MongoDB connection URI. |
| `JWT_SECRET` | A long, random signing secret. |
| `GEOAPIFY_API_KEY` | Your Geoapify API key. |

The backend reads Render's `PORT` environment variable automatically. Keep
these values in Render's environment settings, not in the repository. See
the [MongoDB Atlas setup guide](backend/README.md#mongodb-atlas-setup),
Render's [Docker deployment guide][render-docker-docs], and
[monorepo root-directory guide][render-monorepo-docs] for the service fields.

## Useful commands

Run these from `frontend/`:

```sh
pnpm lint
pnpm build
pnpm preview
```

See the [backend API guide](backend/README.md) for authentication, HTTP
endpoints, and Socket.IO events.

[maps-demo-key]: https://developers.google.com/maps/demo-key
[places-api-docs]: https://developers.google.com/maps/documentation/places
[geoapify-keys]: https://myprojects.geoapify.com/help/api-keys/
[render-docker-docs]: https://render.com/docs/docker
[render-monorepo-docs]: https://render.com/docs/monorepo-support
