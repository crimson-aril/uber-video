# Uber Video Backend

Express API and Socket.IO server for the Uber Video ride-booking app. It uses
MongoDB for users, captains, rides, and revoked tokens. The root
[README](../README.md) covers the full project and local setup.

## Requirements and setup

You need Node.js, pnpm, MongoDB, and a Geoapify API key. From this directory,
copy the example environment file, fill in its values, install packages, and
start the development server:

```sh
cp backend_env_example.txt .env
pnpm install
pnpm start
```

The server listens on port `3000` unless `PORT` is set. `GET /` returns
`Hello World` and can be used as a basic availability check.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP and Socket.IO port; defaults to `3000`. |
| `DB_CONNECT` | Yes | MongoDB connection URI. |
| `JWT_SECRET` | Yes | Secret used to sign and verify login tokens. |
| `GEOAPIFY_API_KEY` | Yes | Key for geocoding and route requests. |

## MongoDB Atlas setup

1. Create a MongoDB Atlas project and database deployment.
2. Add a database user with read and write access to the `uber-clone` database.
   This database user is separate from your Atlas account login.
3. Add the IP addresses that may connect to the cluster in Atlas **Network
   Access**. For local development, add your current public IP. For Render,
   open the backend service's **Connect** menu, copy the addresses from its
   **Outbound** tab, and add those ranges to the Atlas IP access list.
4. In Atlas, choose **Connect** and then **Drivers** to get the application
   connection string. Use the `mongodb+srv://` URI and set its database name
   to `uber-clone`.
5. Set the resulting URI as `DB_CONNECT` in `backend/.env` for local
   development, or in the Render backend service's environment settings for a
   deployed service.

It should look like this:

```text
DB_CONNECT=mongodb+srv://<db-user>:<password>@<cluster-host>/uber-clone
```

Replace the placeholders with values from Atlas; keep any query options
included in its generated URI. URL-encode reserved characters in the database
username or password before putting them in the URI. Keep the URI private and
never commit it. Atlas requires both a database user and an allowed IP address
for connections. See the official [Atlas connection guide][atlas-connect],
[IP access list guide][atlas-ip-list], and [Render Atlas guide][render-atlas]
for current dashboard steps.

## Why the backend uses Geoapify

The older tutorial used Google Places for address suggestions. Since it was
written, Google Maps Platform has added a no-cost [Maps Demo Key][maps-demo-key]
for testing with limited features and daily quotas. Google also has a newer
[Places API flow][places-api-docs]. The old integration can fail when its key
or API setup does not match the current flow.
Autocomplete itself has not been removed. Production Google Maps use requires
a standard key and the required API and billing setup.

This backend uses Geoapify for address suggestions, address-to-coordinate
lookup, and route distance/time. The ride service uses those route results to
calculate fare. Set a Geoapify project key as `GEOAPIFY_API_KEY` in this
backend's `.env`. The Google Maps demo key is not a Geoapify key; the optional
Google browser map uses `VITE_GOOGLE_MAPS_API_KEY` in the frontend instead.

Keep the Geoapify key server-side and out of source control. Review
[Geoapify's API key guidance](https://myprojects.geoapify.com/help/api-keys/)
when setting restrictions for a deployed server.

[maps-demo-key]: https://developers.google.com/maps/demo-key
[places-api-docs]: https://developers.google.com/maps/documentation/places
[atlas-connect]: https://www.mongodb.com/docs/atlas/driver-connection/
[atlas-ip-list]: https://www.mongodb.com/docs/atlas/security/ip-access-list/
[render-atlas]: https://render.com/docs/connect-to-mongodb-atlas

## Docker

Run Docker commands from the repository root. Create `backend/.env` first and
set `JWT_SECRET` and `GEOAPIFY_API_KEY`. Compose supplies the MongoDB URL to
the container, so it does not use the local `127.0.0.1` URL from the example.

Build only the backend image:

```sh
docker compose build backend
```

Start MongoDB and the backend, then follow backend logs:

```sh
docker compose up -d mongo backend
docker compose logs -f backend
```

Build the backend image without Compose if needed. The build context is the
repository root because the app source and Dockerfile are in separate
directories:

```sh
docker build -f backend/Dockerfile -t uber-video-backend .
```

Stop the backend and database with `docker compose stop backend mongo`.

## Authentication

Protected endpoints accept a JWT in either the `token` cookie or an
`Authorization` header:

```http
Authorization: Bearer <token>
```

Tokens expire after 24 hours. Logout clears the cookie and adds the token to
the blacklist. Validation errors return status `400`; missing or invalid
authentication returns `401`.

## HTTP API

All endpoints below are relative to the backend origin, such as
`http://localhost:3000`.

### User accounts

#### Register a user

`POST /users/register`

JSON body:

```json
{
  "fullname": {
    "firstname": "Alex",
    "lastname": "Rider"
  },
  "email": "alex@example.com",
  "password": "secret123"
}
```

`fullname.firstname` must contain at least three characters. `lastname` is
optional; if provided, it must contain at least three characters. The email
must be valid and the password must contain at least six characters. A
successful request returns status `201` with a token and user object.

#### Sign in as a user

`POST /users/login`

Send `email` and `password` as JSON. A successful request returns status
`200`, a token, and a user object. Invalid credentials return `401`.

#### Read the user profile

`GET /users/profile` requires authentication and returns the signed-in user.

#### Sign out a user

`GET /users/logout` requires authentication, clears the token cookie, and
returns `{ "message": "Logged out" }`.

### Captain accounts

#### Register a captain

`POST /captains/register`

Send a JSON body with the same `fullname`, `email`, and `password` fields as
user registration, plus a vehicle:

```json
{
  "fullname": {
    "firstname": "Casey",
    "lastname": "Driver"
  },
  "email": "casey@example.com",
  "password": "secret123",
  "vehicle": {
    "color": "Black",
    "plate": "ABC123",
    "capacity": 4,
    "vehicleType": "car"
  }
}
```

`fullname.firstname` must contain at least three characters. `lastname` is
optional; if provided, it must contain at least three characters. The email
must be valid and the password must contain at least six characters.
`vehicle.color` and `vehicle.plate` need at least three characters,
`capacity` must be at least one, and `vehicleType` must be `car`,
`motorcycle`, or `auto`. A successful request returns status `201`, a token,
and a captain object.

#### Sign in as a captain

`POST /captains/login`

Send `email` and `password` as JSON. A successful request returns status
`200`, a token, and a captain object. Invalid credentials return `401`.

#### Read the captain profile

`GET /captains/profile` requires captain authentication and returns the
captain profile, including vehicle information.

#### Sign out a captain

`GET /captains/logout` requires captain authentication, clears the token
cookie, and returns `{ "message": "Logout successfully" }`.

### Maps and location search

All map endpoints require a user token. Query values should be URL encoded.

#### Geocode an address

`GET /maps/get-coordinates?address=<address>` returns `ltd`, `lng`, and
`countryCode` for the first matching address.

#### Get route distance and time

`GET /maps/get-distance-time?origin=<origin>&destination=<destination>`

Returns `distance` and `duration` objects. Each object has a display `text`
and a numeric `value` in meters or seconds, respectively.

#### Find address suggestions

`GET /maps/get-suggestions?input=<search-text>` returns an array of formatted
address strings. Search text must contain at least three characters.

Geoapify failures may return `502` or `503`. A location with no match returns
`404`.

### Rides

Ride endpoints require the user or captain role shown below. Ride vehicle
types are `auto`, `car`, and `moto`.

#### Estimate a fare

`GET /rides/get-fare?pickup=<address>&destination=<address>` requires a user
token. It returns fare amounts for `auto`, `car`, and `moto`, plus a
`currency` object containing its code and symbol.

#### Request a ride

`POST /rides/create` requires a user token. Send this JSON body:

```json
{
  "pickup": "Central Station",
  "destination": "City Hospital",
  "vehicleType": "car"
}
```

The addresses need at least three characters. The response contains the new
ride and a `notifiedCaptains` count. Nearby connected captains receive a
`new-ride` socket event.

#### Cancel a pending ride

`POST /rides/cancel` requires a user token. Send `{ "rideId": "<ride-id>" }`
as JSON. Only the owner can cancel a ride while its status is `pending`.

#### Accept a ride

`POST /rides/confirm` requires captain authentication. Send
`{ "rideId": "<ride-id>" }` as JSON. The ride must still be pending.

#### Start a ride

`GET /rides/start-ride?rideId=<ride-id>&otp=<six-digit-otp>` requires captain
authentication. Only the captain assigned to the ride can start it, and the
OTP must match.

#### Finish a ride

`POST /rides/end-ride` requires captain authentication. Send
`{ "rideId": "<ride-id>" }` as JSON. The ride must be ongoing; completing it
updates the captain's earnings.

Ride status progresses through `pending`, `accepted`, `ongoing`, and
`completed`. A pending ride can also become `cancelled`. Invalid state
transitions may return `409`.

## Socket.IO events

The frontend connects to the same origin as the API. After connecting, a
client registers its account room with `join`:

```js
socket.emit("join", {
  userType: "user",
  userId: "<account-id>",
});
```

Use `userType: "captain"` for a captain. The optional acknowledgement returns
`{ "ok": true }` when registration succeeds.

Captains send location updates with `update-location-captain`:

```js
socket.emit("update-location-captain", {
  userId: "<captain-id>",
  location: { "ltd": 23.78, "lng": 90.41 },
});
```

The server emits these ride events:

- `new-ride` to nearby connected captains when a user requests a ride.
- `ride-cancelled` to connected captains when a user cancels a ride.
- `ride-confirmed` to the user when a captain accepts the request.
- `ride-started` to the user when the captain starts the ride.
- `ride-ended` to the user when the captain completes the ride.

Each event carries the relevant ride object, except `ride-cancelled`, which
carries a `rideId` object.

## Source layout

- `routes/` defines the HTTP endpoints and validation rules.
- `controllers/` handles HTTP requests and responses.
- `services/` contains account, maps, and ride operations.
- `models/` defines the Mongoose schemas.
- `middlewares/` contains authentication checks.
- `socket.js` initializes Socket.IO and room messaging.
