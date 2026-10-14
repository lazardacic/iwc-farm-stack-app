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

**Backend** — Python 3.14, FastAPI, Uvicorn, Motor, Pydantic

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
- Client side validation with Zod, authoritative server side validation with Pydantic
- Server state caching and invalidation with TanStack Query
- One reusable form component shared by the create and edit pages
- Client side search
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
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install "fastapi[standard]" motor pymongo pytest pytest-asyncio httpx argon2-cffi PyJWT

# set the JWT secret before running the API
set JWT_SECRET=your_super_secure_secret_key_here
# Linux / macOS
export JWT_SECRET=your_super_secure_secret_key_here

python seed.py          # loads sample destination documents

fastapi dev main.py     # or: uvicorn main:app --reload
```

The quotes around `"fastapi[standard]"` are required in zsh, which otherwise treats the square brackets as a glob pattern.

The backend requires a `JWT_SECRET` environment variable for token signing. For HS256, a secret of at least 32 bytes is recommended.

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 4. Start the frontend

```bash
cd frontend
npm install
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
├── api/            axiosClient.ts, authApi.ts, destinationsApi.ts
├── assets/         logo.svg, images/
├── components/
│   ├── auth/       ProtectedRoute.tsx, GuestRoute.tsx
│   ├── ui/         Button, Input, Textarea, Card, Badge, Loader, Skeleton,
│   │               Modal, SearchBar, EmptyState, ErrorState
│   ├── forms/      DestinationForm.tsx, AuthForm.tsx
│   ├── destination/  DestinationCard.tsx, DestinationCardSkeleton.tsx
│   └── layout/     Navbar, Footer, MainLayout, ThemeToggle
├── context/        ThemeContext.tsx, AuthContext.tsx, AuthProvider.tsx
├── hooks/          useTheme.ts, useAuth.ts
├── pages/          Home, DestinationDetails, CreateDestination,
│                   EditDestination, Login, Register, NotFound
├── providers/      QueryProvider.tsx
├── routes/         AppRoutes.tsx
├── types/          auth.ts, destination.ts, destinationForm.ts
├── validation/     authSchema.ts, destinationSchema.ts
├── test/           setup.ts
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
| `GET` | `/destinations` | List all destinations | 200 |
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
| `price` | number | yes |
| `rating` | number (0 to 5) | yes |
| `featured` | boolean | no |
| `tags` | string[] | no |

## Configuration

These values are configured in code and environment variables for the backend auth layer.

| Value | Setting |
| --- | --- |
| MongoDB connection | `mongodb://localhost:27017` |
| Backend | `http://localhost:8000` |
| Frontend dev server | `http://localhost:5173` |
| JWT secret | `JWT_SECRET` environment variable |
| Auth token storage | browser `localStorage` |
| Query stale time | 5 minutes |
| Query retry count | 1 |

Running against anything other than localhost currently requires a source edit. Moving these to `MONGODB_URL` on the backend and `VITE_API_URL` on the frontend is a small change and the recommended next step.

## Testing

The backend includes automated tests for the MongoDB-backed data flow, auth flow, and FastAPI endpoints. Current coverage is split into:

- Unit tests for Pydantic models and password validation
- Auth tests for registration, login, JWT decode, and current user lookup
- Authorization tests for protected routes and admin-only access
- Service tests for create, read, update, and delete logic
- API integration tests that run FastAPI against a separate MongoDB test database

The frontend currently includes focused auth route guard tests and a production build check.

Run the backend test suite from `backend/`:

```bash
pytest -q
```

If you are using the local virtual environment on Windows, the equivalent command is:

```bash
C:/Projects/iwc-farm-stack-app/.venv/Scripts/python.exe -m pytest -q
```

Run the frontend auth guard tests from `frontend/`:

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

- broader frontend tests for forms, auth provider behavior, and mutation flows
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
| Configuration hardcoded | Running against a remote database needs a code change |
| No pagination | `GET /destinations` returns the entire collection |
| Client side search only | Filtering cost and payload size grow with the collection |
| No indexes beyond `_id` | Backend filtering would do a full collection scan |
| Images referenced by URL | The app does not control image availability or size |
| Local development only | No production build, reverse proxy, or deployment pipeline |

## Roadmap

Ordered by value:

1. **Refresh tokens and session management** — long-lived auth flow with token refresh and revocation support.
2. **Broader frontend tests** — auth provider tests, form tests, and user interaction coverage.
3. **More backend failure cases** — invalid ids, missing documents, malformed payloads, and unavailable MongoDB.
4. **Environment variables** — small, required before any deployment.
5. **Pagination and server side filtering** — `?page=1&limit=20`, filtering by country, price range, and rating, backed by an index.
6. **Image upload** — file upload with cloud storage and optimization, replacing URL references.
7. **Deployment** — production Compose setup, Nginx reverse proxy, CI/CD.

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
