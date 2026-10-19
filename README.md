# FARM Stack Learning Project

A travel destination management application built with **FastAPI, React, MongoDB, and Docker**.

Full CRUD over a REST API, with client and server side validation, cached server state, and error handling at every layer. Built as an individual learning project, structured with practices used in production systems rather than as a tutorial exercise.

> **Status:** backend and frontend authentication flows are implemented and validated for local development. The project now includes JWT-based auth, role checks, protected frontend routes, session-aware UI, and an automated test suite covering backend auth, API integration, and frontend route guards. See [Testing](#testing) and [Known limitations](#known-limitations).

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

**Frontend** — React, TypeScript, Vite, React Router, Axios, TanStack Query, React Hook Form, Zod, Tailwind CSS, React Hot Toast, clsx, React Icons

**Backend** — Python 3.14, FastAPI, Uvicorn, Motor, Pydantic, python-dotenv

**Database and tooling** — MongoDB, Docker, Docker Compose

## Features

- Complete CRUD lifecycle over a single `destinations` resource
- REST API with automatic OpenAPI documentation at `/docs`
- JWT-based authentication with register/login flow
- Current-user endpoint and role-based access control
- Admin-only protected destination deletion and mutation rules
- Frontend login/register pages with persistent session state
- Protected frontend routes for create and edit pages
- Session-aware navigation and automatic logout on invalid or expired token
- Admin-only UI actions for destructive operations
- Admin-only `/admin/users` page for managing user roles
- Client side validation with Zod, authoritative server side validation with Pydantic
- Server state caching and invalidation with TanStack Query
- One reusable form component shared by the create and edit pages
- Server side destination search and pagination
- Destination filters by country, price range, minimum rating, and featured status
- Stable destination sorting by price, rating, title, or creation order
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

pip install -r requirements.txt

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
- `user@example.com` / `user12345`

### Troubleshooting

If the frontend loads but shows an error state, the backend is usually not running or the database container has stopped. Check with `docker ps`.

If `pytest` is not available in your shell, run it through the virtual environment Python executable instead of the global interpreter.

## Project structure

```
src/
├── api/            axiosClient.ts, authApi.ts, destinationsApi.ts, usersApi.ts
├── assets/         logo.svg, images/
├── components/
│   ├── auth/       ProtectedRoute.tsx, GuestRoute.tsx
│   ├── ui/         Button, Input, Textarea, Card, Badge, Loader, Skeleton,
│   │               Modal, SearchBar, Select, Pagination, EmptyState, ErrorState
│   ├── forms/      DestinationForm.tsx, AuthForm.tsx
│   ├── destination/  DestinationCard.tsx, DestinationCardSkeleton.tsx, DestinationFilters.tsx
│   └── layout/     Navbar, Footer, MainLayout, ThemeToggle
├── context/        ThemeContext.tsx, AuthContext.tsx, AuthProvider.tsx
├── hooks/          useTheme.ts, useAuth.ts
├── pages/          Home, DestinationDetails, CreateDestination,
│                   EditDestination, AdminUsers, Login, Register, NotFound
├── providers/      QueryProvider.tsx
├── routes/         AppRoutes.tsx
├── types/          auth.ts, destination.ts, destinationForm.ts, user.ts
├── utils/          destinationFilters.ts, apiError.ts
├── validation/     authSchema.ts, destinationSchema.ts
├── test/           setup.ts, renderWithProviders.tsx
├── styles/         globals.css
├── App.tsx
└── main.tsx
```

Components never call Axios directly. All HTTP lives in `api/`, which exposes one function per operation. Validation rules live in a single Zod schema in `validation/`.
Authentication state lives in a global context provider, and protected pages are enforced through route guard components instead of page-local checks.

## API reference

### Destination routes

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/destinations?page=1&page_size=9&search=Japan` | Search, filter, and list a page of destinations | 200 |
| `GET` | `/destinations/countries` | List distinct destination countries | 200 |
| `GET` | `/destinations/{id}` | Get one destination | 200 |
| `POST` | `/destinations` | Create a destination | 200 |
| `PUT` | `/destinations/{id}` | Update a destination | 200 |
| `DELETE` | `/destinations/{id}` | Delete a destination | 200 |

### Auth routes

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Register a new user | 201 |
| `POST` | `/auth/login` | Authenticate and receive JWT | 200 |
| `GET` | `/auth/me` | Return current authenticated user | 200 |

### User management routes (admin only)

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/users?page=1&page_size=20&search=team` | Search and list users by email | 200 |
| `PATCH` | `/users/{id}/role` | Change a user's role (`{"role": "admin"}`) | 200 |

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
  "tags": ["summer", "island"]
}
```

| Field | Type | Required |
| --- | --- | --- |
| `_id` | ObjectId | generated, serialized as a string in responses |
| `title` | string | yes |
| `country` | string | yes |
| `description` | string | yes |
| `image` | string (URL) | yes |
| `price` | number (greater than 0) | yes |
| `rating` | number (0 to 5) | yes |
| `featured` | boolean | no |
| `tags` | string[] | no |

## Configuration

Backend settings are read from `backend/.env`; frontend settings are read from `frontend/.env`. Copy each `.env.example` to `.env` before starting the app. The actual `.env` files are ignored by git.

| Variable | Used by | Default / example |
| --- | --- | --- |
| `JWT_SECRET` | Backend | Required; at least 32 bytes |
| `MONGODB_URL` | Backend | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Backend | `farm_db` |
| `CORS_ORIGINS` | Backend | `http://localhost:5173`; comma-separated for multiple origins |
| `VITE_API_URL` | Frontend | `http://localhost:8000` |

The API and frontend dev server still default to `http://localhost:8000` and `http://localhost:5173`, respectively. Vite exposes `VITE_*` values in the browser bundle, so do not put secrets in frontend env files.

## Testing

The backend includes automated tests for the MongoDB-backed data flow, auth flow, and FastAPI endpoints. Current coverage is split into:

- Unit tests for Pydantic models and password validation
- Auth tests for registration, login, JWT decode, and current user lookup
- Authorization tests for protected routes and admin-only access
- Service tests for create, read, update, and delete logic
- API integration tests that run FastAPI against a separate MongoDB test database

The frontend includes tests for auth route guards, the destination list (loading, empty, error, pagination, sort, and filters), the destination and auth forms, the filter panel, and the admin users page, plus a production build check.

Run the backend test suite from `backend/`:

```bash
pytest -q
```

If you are using the local virtual environment on Windows, the equivalent command is:

```bash
C:/Projects/iwc-farm-stack-app/.venv/Scripts/python.exe -m pytest -q
```

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

- tests for auth provider behavior and the create/edit/delete pages
- refresh token flow and logout handling
- password reset / email verification flows
- MongoDB connection failure or unavailable database scenarios
- broader edge-case coverage for partial updates, empty search results, and future endpoints

## Known limitations

| Limitation | Consequence |
| --- | --- |
| No refresh token flow | JWT sessions remain single-token and expire after one lifetime |
| No password reset or email verification | Recovery and account lifecycle are still manual |
| Auth token stored in `localStorage` | Simpler client integration, but not the strongest production security model |
| Filters are not in the URL | Filtered views cannot be bookmarked or shared yet |
| Search uses unanchored regex | Text search still scans the collection; filters use indexes |
| Images referenced by URL | The app does not control image availability or size |
| Local development only | No production build, reverse proxy, or deployment pipeline |

## Roadmap

Ordered by value:

1. **Refresh tokens and session management** — long-lived auth flow with token refresh and revocation support.
2. **Broader frontend tests** — auth provider tests, form tests, and user interaction coverage.
3. **More backend failure cases** — invalid ids, missing documents, malformed payloads, and unavailable MongoDB.
4. **Image upload** — file upload with cloud storage and optimization, replacing URL references.
5. **Deployment** — production Compose setup, Nginx reverse proxy, CI/CD.

## Documentation

Full technical documentation, covering architecture, layer responsibilities, the data model, the REST interface, error handling, and the reasoning behind each decision, is in `docs/FARM_Stack_Technical_Documentation.pdf`.

## License

Released under the MIT License. See [LICENSE](LICENSE) for the full text.

---

<!--
  TODO before publishing:
  - add screenshots or a short demo GIF near the top
  - confirm the copyright holder name in LICENSE
-->
