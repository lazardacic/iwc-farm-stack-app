# FARM Stack Learning Project

A travel destination management application built with **FastAPI, React, MongoDB, and Docker**.

Full CRUD over a REST API, with client and server side validation, cached server state, and error handling at every layer. Built as an individual learning project, structured with practices used in production systems rather than as a tutorial exercise.

> **Status:** feature-complete for its scope and tested end to end. It has three roles with destination ownership, image upload with resizing, filters kept in the URL, short-lived access tokens with rotating refresh tokens, a Docker production stack and GitHub Actions CI. About 180 backend and 90 frontend tests run on every push. See [Testing](#testing) and [Known limitations](#known-limitations).

**Repository:** <https://github.com/lazardacic/iwc-farm-stack-app>

---

## Contents

- [About](#about)
- [Tech stack](#tech-stack)
- [Features](#features)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Configuration](#configuration)
- [Testing](#testing)
- [Docker deployment](#docker-deployment)
- [Continuous integration](#continuous-integration)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [License](#license)

---

## About

The application manages travel destination records. Users can list, search, view, create, edit, and delete destinations.

The React frontend talks to the FastAPI REST API over HTTP using Axios. FastAPI validates each request with Pydantic, applies business logic, and reads and writes MongoDB asynchronously through Motor. On the client, TanStack Query owns server state: caching, loading and error states, and cache invalidation after mutations.

The domain is travel destinations, but the architecture is a general purpose CRUD pattern. The same structure applies to a product catalogue, an inventory system, or an admin dashboard.

```
React (Vite)  ──[Axios / JSON]──▶  FastAPI  ──[Motor]──▶  MongoDB (Docker)
   :5173                            :8000                    :27017
```

## Tech stack

**Frontend** — React, TypeScript, Vite, React Router, Axios, TanStack Query, Zustand, React Hook Form, Zod, Tailwind CSS, Headless UI, React Hot Toast, clsx, React Icons, Vitest, Testing Library

**Backend** — Python 3.14, FastAPI, Uvicorn, Motor, Pydantic, PyJWT, Argon2, Pillow, Cloudinary SDK, python-dotenv, pytest

**Database and tooling** — MongoDB 7, Docker, Docker Compose, Nginx, GitHub Actions

## Features

- Complete CRUD lifecycle over a single `destinations` resource
- REST API with automatic OpenAPI documentation at `/docs`
- JWT-based authentication with register/login flow
- Short-lived access tokens (15 min) kept in memory, renewed silently from a rotating refresh token in an `httpOnly` cookie (7 days)
- Refresh token reuse detection and server-side logout that revokes the session
- Current-user endpoint and role-based access control
- Three roles: `admin`, `editor` and `subscriber`, enforced on the backend
- Destination ownership: editors edit only what they created; only admins delete
- Frontend login/register pages; the session survives reloads through the refresh cookie
- Protected frontend routes for create and edit pages
- Session-aware navigation; requests that hit an expired access token are refreshed and retried once, and a failed refresh signs the user out
- Auth state in a Zustand store that the Axios interceptor reads directly
- Admin-only UI actions for destructive operations
- Admin-only `/admin/users` page for managing user roles
- Welcome page that shows each signed-in user their role and what it allows
- Image upload (JPEG, PNG, WebP up to 5 MB) to local storage or Cloudinary, with preview
- Uploaded images are resized to at most 1600 px, converted to WebP and stripped of EXIF metadata (including GPS location)
- Uploads never attached to a destination are deleted automatically after 24 hours
- Bundled grayscale placeholder images, assigned at random when a destination has no image
- Client side validation with Zod, authoritative server side validation with Pydantic
- Server state caching and invalidation with TanStack Query
- One reusable form component shared by the create and edit pages
- Server side destination search and pagination
- Destination filters by country, price range, minimum rating, and featured status
- Stable destination sorting by price, rating, title, or creation order
- Search, filters, sort and page kept in the URL (`/?country=Japan&sort=price_asc&page=2`), so views can be shared, bookmarked and restored with Back
- Featured slider at the top of the home page: up to 5 destinations chosen by admins, with arrows, dots and swipe, and no autoplay
- "My destinations" page for editors and admins, listing only what they published
- Destination pages laid out like a blog post: large image, readable text column and a trip details panel
- Inter and Plus Jakarta Sans fonts, bundled with the app
- Admin user management: list and search users, change roles (admin-only on the backend)
- Light and dark theme with a persisted preference
- Skeleton loaders, empty states, and error states
- Toast notifications on success and failure
- Responsive layout for desktop, tablet, and mobile

## Getting started

### Prerequisites

- Python 3
- Node.js and npm
- Docker and Docker Compose

Three processes run at the same time: the MongoDB container, the FastAPI backend, and the Vite dev server.

### 1. Clone the repository

```bash
git clone https://github.com/lazardacic/iwc-farm-stack-app.git
cd iwc-farm-stack-app
```

### 2. Start the database

`docker-compose.yml`:

```yaml
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
```

```bash
docker-compose up -d
```

MongoDB is now reachable at `mongodb://localhost:27017`.

### 3. Start the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements-dev.txt   # app + test dependencies

# Create backend/.env from the example (run from backend/)
cp .env.example .env
# PowerShell equivalent: Copy-Item .env.example .env

python seed.py          # loads sample destination documents

fastapi dev main.py     # or: uvicorn main:app --reload
```

Edit `backend/.env` and replace the development `JWT_SECRET` with a unique random value before deployment. The backend loads this file automatically.

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 4. Start the frontend

```bash
cd frontend
npm install
cp .env.example .env
# PowerShell equivalent: Copy-Item .env.example .env
npm run dev
```

App: `http://localhost:5173`

To create local development users without registering manually each time, you can also run:

```bash
cd backend
python seed_users.py
```

This creates:
- `admin@example.com` / `admin1234`
- `editor@example.com` / `editor1234`
- `subscriber@example.com` / `subscriber1234`

Run `seed_users.py` before `seed.py`: the 99 seeded destinations then belong to `editor@example.com`, so that account has destinations of its own to edit. Five of them are featured.

### Roles

| Action | Admin | Editor | Subscriber |
| --- | --- | --- | --- |
| Browse destinations, see the welcome page | yes | yes | yes |
| Create destinations and upload images | yes | yes | no |
| Edit destinations | all | only their own | no |
| Delete destinations | yes | no | no |
| Feature destinations on the home page | yes | no | no |
| See "My destinations" | yes | yes | no |
| List users and change roles | yes | no | no |

New accounts start as `subscriber`. Accounts stored with the old `user` role are migrated to `subscriber` when the backend starts. Destinations created before ownership existed have no owner, so only admins can edit them.

### Troubleshooting

If the frontend loads but shows an error state, the backend is usually not running or the database container has stopped. Check with `docker ps`.

If `pytest` is not available in your shell, run it through the virtual environment Python executable instead of the global interpreter.

If `uvicorn main:app` reports `Could not import module "main"`, it was started outside `backend/`. Run it from `backend/`, where `main.py` lives.

## Project structure

```
src/
├── api/            axiosClient.ts, authApi.ts, destinationsApi.ts, imagesApi.ts, usersApi.ts
├── assets/         logo.svg, images/
├── components/
│   ├── auth/       ProtectedRoute.tsx, GuestRoute.tsx, AuthSession.tsx
│   ├── ui/         Button, Input, Textarea, Card, Badge, Loader, Skeleton,
│   │               Modal, SearchBar, Select, Pagination, EmptyState, ErrorState
│   ├── forms/      DestinationForm.tsx, AuthForm.tsx, ImageInput.tsx
│   ├── destination/  DestinationCard.tsx, DestinationCardSkeleton.tsx, DestinationFilters.tsx,
│   │               DestinationImage.tsx, FeaturedSlider.tsx
│   └── layout/     Navbar, Footer, MainLayout, ThemeToggle
├── context/        ThemeContext.tsx, ThemeProvider.tsx
├── store/          authStore.ts (Zustand)
├── hooks/          useTheme.ts, useAuth.ts
├── pages/          Home, DestinationDetails, CreateDestination,
│                   EditDestination, MyDestinations, AdminUsers, Welcome,
│                   Login, Register, NotFound
├── providers/      QueryProvider.tsx
├── routes/         AppRoutes.tsx
├── types/          auth.ts, destination.ts, destinationForm.ts, user.ts
├── utils/          destinationFilters.ts, homeSearchParams.ts, permissions.ts,
│                   imageFiles.ts, formatters.ts, apiError.ts
├── validation/     authSchema.ts, destinationSchema.ts
├── test/           setup.ts, renderWithProviders.tsx, LocationProbe.tsx, selectOption.ts
├── styles/         globals.css
├── App.tsx
└── main.tsx
```

Components never call Axios directly. All HTTP lives in `api/`, which exposes one function per operation. Validation rules live in a single Zod schema in `validation/`.
Authentication state lives in a Zustand store that both components and the Axios interceptor read, and protected pages are enforced through route guard components instead of page-local checks. List state for the home page lives in the URL.

Public files in `frontend/public/` include `placeholders/`, six grayscale SVGs assigned to destinations without an image.

## API reference

### Destination routes

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/destinations?page=1&page_size=9&search=Japan` | Search, filter, and list a page of destinations | 200 |
| `GET` | `/destinations/countries` | List distinct destination countries | 200 |
| `GET` | `/destinations/featured` | Up to 5 featured destinations, most recently featured first | 200 |
| `PATCH` | `/destinations/{id}/featured` | Feature or unfeature (`{"featured": true}`); admin only; 409 when 5 are already featured | 200 |
| `GET` | `/destinations/{id}` | Get one destination | 200 |
| `POST` | `/destinations` | Create a destination (admin, editor) | 200 |
| `PUT` | `/destinations/{id}` | Update a destination (admin, or the editor who created it) | 200 |
| `DELETE` | `/destinations/{id}` | Delete a destination (admin) | 200 |

### Image routes

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `POST` | `/images` | Upload one image as multipart field `file` (admin, editor); returns `{"url": "..."}` | 201 |

The backend checks the file content, not its name or declared type: JPEG, PNG and WebP up to 5 MB are accepted (otherwise 415, 413, or 400 for an empty file). Accepted images are decoded with Pillow, rotated according to their EXIF orientation, resized to at most 1600 px on the longest side, and saved as WebP without metadata. A file that cannot be decoded, or has more than 40 million pixels, returns 400. Each upload is recorded with its uploader. A destination may use an uploaded image only if the same user uploaded it, or the user is an admin (otherwise 403). When a destination's image is replaced or removed, or the destination is deleted, the old upload is deleted unless another destination still uses it.

A destination saved with an empty `image` gets one of the bundled placeholders (`/placeholders/*.svg`, served by the frontend). Image values must be an `http(s)` URL or a relative path; `javascript:`, `data:` and other schemes return 422.

### Auth routes

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Register a new user | 201 |
| `POST` | `/auth/login` | Authenticate and receive JWT | 200 |
| `POST` | `/auth/refresh` | Exchange the refresh cookie for a new access token; rotates the cookie | 200 |
| `POST` | `/auth/logout` | Revoke the session's refresh tokens and clear the cookie | 204 |
| `GET` | `/auth/me` | Return current authenticated user | 200 |

**Sessions.** Login returns a 15-minute access token in the body and sets a 7-day refresh token as an `httpOnly`, `SameSite=Lax` cookie scoped to `/auth` (`/api/auth` behind Nginx). The frontend keeps the access token in memory only; on load and whenever a request returns 401, it calls `/auth/refresh` once, even when several requests fail together.

Refresh tokens are random strings stored only as SHA-256 hashes in the `refresh_tokens` collection, which MongoDB expires automatically. Each refresh rotates the token. Reusing a rotated token revokes the whole session, because it means the token was copied; a second use within 10 seconds is allowed, so two tabs refreshing at once do not sign the user out. Logout revokes only the current session, so other devices stay signed in.

### User management routes (admin only)

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/users?page=1&page_size=20&search=team` | Search and list users by email | 200 |
| `PATCH` | `/users/{id}/role` | Change a user's role to `admin`, `editor` or `subscriber` | 200 |

Every `/users` route requires an admin token: missing or invalid tokens return 401, non-admin users get 403. Admins cannot change their own role (400), which keeps at least one admin in place. Role changes take effect on the user's next request because the role is read from the database on every request. Password hashes are never returned.

**Status codes**

| Code | When |
| --- | --- |
| 400 | Duplicate email or malformed request handling |
| 401 | Missing, invalid, expired, or unknown token |
| 403 | Token is valid but role is not allowed |
| 404 | Valid id, but no matching document |
| 422 | Pydantic rejected one or more fields in the body |
| 500 | Unhandled backend or database error |

400 and 404 are deliberately distinct: a malformed id is a client bug, a valid id with no match usually means the record was deleted elsewhere.

The destination list response contains `items`, `total`, `page`, `page_size`, and `pages`. `page` must be at least 1, `page_size` must be between 1 and 100, and `search` matches destination titles and countries without case sensitivity.

Optional filters combine with search and with each other:

| Param | Rule |
| --- | --- |
| `country` | exact country name, as returned by `/destinations/countries` |
| `min_price`, `max_price` | at least 0; `min_price` must not exceed `max_price` |
| `min_rating`, `max_rating` | between 0 and 5; `min_rating` must not exceed `max_rating` |
| `featured` | `true` or `false` |
| `sort` | `oldest` (default), `newest`, `price_asc`, `price_desc`, `rating_desc`, `title_asc` |
| `mine` | `true` lists only the caller's own destinations; needs a token, otherwise 401 |

Invalid filter or sort values return 422. Every sort uses `_id` as a tiebreaker, so items with equal values keep the same order across pages. The backend creates indexes on `country`, `price`, `rating`, and `featured` at startup.

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 9,
  "pages": 0
}
```

## Data model

A destination is one self contained document. No joins, no transformation layer between the database and the API response.

```json
{
  "_id": "685fa3c2e1b40a7d3c9f1e04",
  "title": "Santorini",
  "country": "Greece",
  "description": "Beautiful island in the Aegean Sea.",
  "image": "https://example.com/images/santorini.jpg",
  "price": 1499,
  "rating": 4.8,
  "featured": true,
  "tags": ["summer", "island"],
  "created_by": "685fa3c2e1b40a7d3c9f1d11",
  "image_public_id": null
}
```

| Field | Type | Required |
| --- | --- | --- |
| `_id` | ObjectId | generated, serialized as a string in responses |
| `title` | string | yes |
| `country` | string | yes |
| `description` | string | yes |
| `image` | string: `http(s)` URL or relative path | no; empty gets a placeholder |
| `price` | number (greater than 0) | yes |
| `rating` | number (0 to 5) | yes |
| `featured` | boolean | changed only through `PATCH /destinations/{id}/featured`; create and update ignore it |
| `tags` | string[] | no |
| `created_by` | string (user id) | set by the backend on create |
| `featured_at` | datetime | set by the backend when an admin features the destination; orders the slider |
| `image_public_id` | string | internal; set when `image` is one of our uploads, never returned |

## Configuration

Backend settings are read from `backend/.env`; frontend settings are read from `frontend/.env`. Copy each `.env.example` to `.env` before starting the app. The actual `.env` files are ignored by git.

| Variable | Used by | Default / example |
| --- | --- | --- |
| `JWT_SECRET` | Backend | Required; at least 32 bytes |
| `MONGODB_URL` | Backend | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Backend | `farm_db` |
| `CORS_ORIGINS` | Backend | `http://localhost:5173`; comma-separated for multiple origins |
| `VITE_API_URL` | Frontend | `http://localhost:8000` |
| `IMAGE_STORAGE` | Backend | `local` (files in `backend/media`, served at `/media`) or `cloudinary` |
| `API_PUBLIC_URL` | Backend | `http://localhost:8000`; base for links to locally stored images |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Backend | Required only with `IMAGE_STORAGE=cloudinary`; the backend refuses to start if one is missing |
| `ORPHAN_UPLOAD_MAX_AGE_HOURS` | Backend | `24`; uploads not used by any destination after this long are deleted |
| `UPLOAD_CLEANUP_INTERVAL_HOURS` | Backend | `6`; how often that cleanup runs; `0` turns it off |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Backend | `7` |
| `COOKIE_SECURE` | Backend | `false`; set `true` when served over HTTPS |

The API and frontend dev server still default to `http://localhost:8000` and `http://localhost:5173`, respectively. Vite exposes `VITE_*` values in the browser bundle, so do not put secrets in frontend env files.

## Testing

The backend includes automated tests for the MongoDB-backed data flow, auth flow, and FastAPI endpoints. Current coverage is split into:

- Unit tests for Pydantic models, password validation, image type detection and the query builder
- Auth tests for registration, login, JWT decode, current user lookup, refresh token rotation, reuse detection and logout
- Authorization tests for every role, destination ownership and admin-only access
- Image tests for upload validation, resizing, EXIF handling and orphan cleanup
- Service tests for create, read, update, and delete logic
- API integration tests that run FastAPI against a separate MongoDB test database

The frontend includes tests for the auth store, the Axios refresh interceptor, session handling, route guards, the destination list (loading, empty, error, pagination, sort, filters and URL state), the destination and auth forms, the image field, permissions, the filter panel and the admin users page, plus a production build check.

Run the backend test suite from `backend/`:

```bash
pytest -q
```

The tests need MongoDB on `localhost:27017` (the dev `docker-compose.yml`). To use another instance, set `MONGODB_URL`, for example `MONGODB_URL=mongodb://localhost:27018 pytest -q`.

Run the frontend tests from `frontend/`:

```bash
npm run test
```

Run the frontend production build:

```bash
npm run build
```

### Integration Testing

The project uses a separate MongoDB database for integration tests:

- Application database: `farm_db`
- Test database: `farm_test_db`

Both databases run on the same MongoDB instance.

Pytest fixtures provide access to the test database and destination collection. Test data is cleaned up after tests so the production/development database is never modified.

FastAPI dependency overrides are used to make API tests use the test database instead of `farm_db`.

### Gaps To Add

The current suite covers the main auth and CRUD paths, but there are still useful additions for broader production readiness:

- tests for the create, edit and destination detail pages
- password reset / email verification flows
- MongoDB connection failure or unavailable database scenarios
- broader edge-case coverage for partial updates, empty search results, and future endpoints

## Docker deployment

`docker-compose.prod.yml` runs the whole app in containers: MongoDB, the FastAPI backend and the built React app served by Nginx. The dev `docker-compose.yml` (MongoDB only) is unchanged.

```bash
cp .env.example .env        # set JWT_SECRET; generate one with the command in the file
docker compose -f docker-compose.prod.yml up --build -d
```

App: `http://localhost:8080`. API docs: `http://localhost:8080/api/docs`.

```
Browser ──▶ Nginx :8080 ──┬─ /            built React app (SPA fallback to index.html)
                          ├─ /placeholders bundled placeholder images
                          └─ /api/*  ──▶  FastAPI :8000 ──▶ MongoDB :27017
                                          └─ /media  uploaded images (local storage)
```

- The frontend calls the API on the same origin under `/api`, so the browser needs no CORS. Nginx strips the prefix; uvicorn runs with `--root-path /api` so redirects and `/docs` use the right path.
- MongoDB is not published on a host port. Its data lives in the `mongo-data` volume, and local uploads in the `media` volume.
- The backend runs as a non-root user and waits for a healthy MongoDB; Nginx waits for a healthy backend.
- Nginx accepts request bodies up to 6 MB for image uploads and caches hashed `/assets` for a year.
- To use Cloudinary, set `IMAGE_STORAGE=cloudinary` and the three `CLOUDINARY_*` keys in `.env`.
- Seed data inside the stack: `docker compose -f docker-compose.prod.yml exec backend python seed.py` (and `seed_users.py`).

Stop with `docker compose -f docker-compose.prod.yml down`; add `-v` to also delete the database and uploads.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request:

| Job | Steps |
| --- | --- |
| Backend tests | Python 3.14, `pip install -r requirements-dev.txt`, `pytest` against a MongoDB 7.0 service container |
| Frontend | Node 24, `npm ci`, `npm run lint`, `npm run test`, `npm run build` |
| Docker images | Builds the backend and frontend images, after both test jobs pass |

## Known limitations

| Limitation | Consequence |
| --- | --- |
| No password reset or email verification | Recovery and account lifecycle are still manual |
| Access tokens cannot be revoked | A stolen access token stays valid until it expires, at most 15 minutes |
| `COOKIE_SECURE` is off by default | Over plain HTTP the refresh cookie can be read on the network; set it to `true` behind HTTPS |
| Search uses unanchored regex | Text search still scans the collection; filters use indexes |
| Image cleanup runs inside the API process | With several backend replicas, each would run its own cleanup |
| No hosting target yet | The Docker stack runs on one machine; there is no cloud deployment or HTTPS |

## Roadmap

Ordered by value:

1. **Reviews or favorites** — a second resource linked to users and destinations.
2. **More backend failure cases** — invalid ids, missing documents, malformed payloads, and unavailable MongoDB.
3. **Hosting** — deploy the Docker stack to a server with HTTPS and push images from CI.

## Documentation

In the repository:

- `README.md` — setup, API reference, data model, configuration, testing and deployment
- `backend/AUTHENTICATION.md` — users, roles, tokens and the frontend auth flow

Development logs describing each round of work, with the reasoning behind decisions, are kept outside the repository.

## License

Released under the MIT License. See [LICENSE](LICENSE) for the full text.

---

<!--
  TODO before publishing:
  - add screenshots or a short demo GIF near the top
  - confirm the copyright holder name in LICENSE
-->
