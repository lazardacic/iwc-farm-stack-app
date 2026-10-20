# Authentication and Authorization Documentation

## Overview

This backend implements a simple but production-style authentication and authorization layer on top of the existing FARM Stack architecture.

The implementation follows the current project structure without introducing a repository pattern or changing the route → service → MongoDB flow.

Relevant files:
- [backend/security.py](./security.py)
- [backend/routes/auth.py](./routes/auth.py)
- [backend/routes/destinations.py](./routes/destinations.py)
- [backend/database/dependencies.py](./database/dependencies.py)
- [backend/models/user.py](./models/user.py)
- [backend/tests/conftest.py](./tests/conftest.py)
- [frontend/src/api/axiosClient.ts](../frontend/src/api/axiosClient.ts)
- [frontend/src/context/AuthProvider.tsx](../frontend/src/context/AuthProvider.tsx)
- [frontend/src/routes/AppRoutes.tsx](../frontend/src/routes/AppRoutes.tsx)

## What is implemented

### 1. User model and validation
The user schema includes:
- email validation via Pydantic `EmailStr`
- password minimum length
- default role: `subscriber`
- `UserRole` as literal union: `"admin" | "editor" | "subscriber"`
- legacy `user` roles are read as `subscriber` and migrated at startup

Defined in:
- [backend/models/user.py](./models/user.py)

### 2. Password hashing
Passwords are hashed with Argon2 before being stored in MongoDB.

There are two main helpers:
- `hash_password(password: str) -> str`
- `verify_password(password: str, password_hash: str) -> bool`

Defined in:
- [backend/security.py](./security.py)

### 3. JWT-based authentication
The backend generates access tokens using HS256 and stores the user id in the JWT subject (`sub`).

Functions:
- `create_access_token(user_id: str) -> str`
- `decode_access_token(token: str) -> str`

JWT settings:
- algorithm: `HS256`
- expiration: 15 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`)
- a `type: "access"` claim; tokens without it are rejected
- secret: from environment variable `JWT_SECRET`

Refresh tokens ([backend/services/refresh_tokens.py](./services/refresh_tokens.py)):
- random 48-byte strings, stored only as SHA-256 hashes in `refresh_tokens`
- valid 7 days (`REFRESH_TOKEN_EXPIRE_DAYS`); a TTL index deletes expired ones
- rotated on every use; a family id groups one login's tokens
- reuse of a rotated token revokes the family, except within a 10-second grace period for concurrent tabs
- sent as an `httpOnly`, `SameSite=Lax` cookie on the `/auth` path (`Secure` when `COOKIE_SECURE=true`)

Defined in:
- [backend/security.py](./security.py)

### 4. Auth routes
Implemented routes under `/auth`:

- `POST /auth/register`
  - registers a new user
  - lowercases email
  - checks for duplicate email
  - hashes the password before saving
  - returns created user without password hash

- `POST /auth/login`
  - validates email and password
  - checks password against stored hash
  - returns JWT access token

- `GET /auth/me`
  - reads Bearer token from `Authorization` header
  - resolves current user from MongoDB
  - returns current user info without password hash

Defined in:
- [backend/routes/auth.py](./routes/auth.py)

### 5. Authorization
The auth layer introduces reusable dependency-based authorization helpers:

- `get_current_user(...)`
- `CurrentUser`
- `require_roles(*roles: str)`

This is used to protect routes based on the authenticated user role.

### 6. Protected destination endpoints
Destination routes are now protected by auth and authorization logic:

- `POST /destinations/` requires authenticated user
- `PUT /destinations/{id}` requires authenticated user
- `DELETE /destinations/{id}` requires admin role

Public access remains allowed for reading destinations:
- `GET /destinations/`
- `GET /destinations/{id}`

Defined in:
- [backend/routes/destinations.py](./routes/destinations.py)

### 7. Frontend auth integration
The frontend now consumes the backend auth API and enforces the same access model in the UI.

Implemented frontend behavior:
- login page and register page
- global auth state in a Zustand store ([frontend/src/store/authStore.ts](../frontend/src/store/authStore.ts))
- access token kept in memory only; nothing is stored in `localStorage`
- automatic `Authorization: Bearer <token>` header injection through Axios
- protected frontend routes for create and edit pages
- guest-only routes for login and register pages
- session recovery through `POST /auth/refresh` and `GET /auth/me` on app startup
- silent token refresh and one retry when a request returns 401
- sign-out and redirect to login when the refresh fails
- admin-only delete controls in the UI

Relevant frontend files:
- [frontend/src/api/authApi.ts](../frontend/src/api/authApi.ts)
- [frontend/src/api/axiosClient.ts](../frontend/src/api/axiosClient.ts)
- [frontend/src/context/AuthProvider.tsx](../frontend/src/context/AuthProvider.tsx)
- [frontend/src/components/auth/ProtectedRoute.tsx](../frontend/src/components/auth/ProtectedRoute.tsx)
- [frontend/src/components/auth/GuestRoute.tsx](../frontend/src/components/auth/GuestRoute.tsx)
- [frontend/src/pages/Login.tsx](../frontend/src/pages/Login.tsx)
- [frontend/src/pages/Register.tsx](../frontend/src/pages/Register.tsx)
- [frontend/src/pages/DestinationDetails.tsx](../frontend/src/pages/DestinationDetails.tsx)

## Database integration
The project keeps using MongoDB collections via dependency injection, without introducing a repository layer.

Dependencies in:
- [backend/database/dependencies.py](./database/dependencies.py)

Collections used:
- `users`
- `destinations`

For local development, the project also includes a helper script that seeds three users (admin, editor, subscriber) into the `users` collection:
- [backend/seed_users.py](./seed_users.py)

Development users created by that script:
- `admin@example.com` / `admin1234`
- `editor@example.com` / `editor1234`
- `subscriber@example.com` / `subscriber1234`

## Testing
The backend uses a test database named `farm_test_db` and overrides dependency injections in tests.

This ensures that integration tests do not touch the production database.

Test configuration:
- [backend/tests/conftest.py](./tests/conftest.py)

Relevant test groups:
- auth login, register, me, authorization
- destination API integration tests
- frontend auth guard tests

## Environment variables
Copy `backend/.env.example` to `backend/.env` for local development. The backend loads the file automatically. Configure:

- `JWT_SECRET`: required token-signing secret, at least 32 bytes
- `MONGODB_URL`: MongoDB connection string (defaults to `mongodb://localhost:27017`)
- `DATABASE_NAME`: application database (defaults to `farm_db`)
- `CORS_ORIGINS`: comma-separated allowed frontend origins (defaults to `http://localhost:5173`)

For production, use a unique randomly generated secret. Never commit `.env` files or put secrets in frontend `VITE_*` variables.

## Example request flow

### Register user
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

Response:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

### Use token on protected route
```http
GET /auth/me
Authorization: Bearer <jwt>
```

### Admin-only delete
```http
DELETE /destinations/{id}
Authorization: Bearer <admin-jwt>
```

## Frontend auth flow

1. A user registers through `POST /auth/register` or logs in through `POST /auth/login`.
2. The backend returns an access token and sets the refresh cookie; the frontend keeps the access token in the Zustand store, in memory.
3. Axios automatically attaches the access token to protected requests.
4. On app startup, `AuthSession` calls `POST /auth/refresh` with the cookie, then `GET /auth/me`, to restore the current user.
5. Protected frontend routes take an `allowedRoles` list: create and edit pages allow `admin` and `editor`, the users page allows `admin`, and the welcome page allows any signed-in user. Others are redirected to `/welcome`.
6. The Edit button shows for admins and for the editor who created the destination; Delete shows only for admins. The backend enforces the same rules.
7. If the backend returns `401` for a signed-in user, the Axios interceptor calls `/auth/refresh` (one call shared by all failing requests) and retries the request once. If the refresh fails, the store marks the session expired and `AuthSession` shows a message and redirects to login.
8. If the backend returns `403`, the frontend shows a forbidden message and keeps the current session.
9. Logout calls `POST /auth/logout`, which revokes the session's refresh tokens and clears the cookie.

## Validation status
The backend auth implementation has been validated with the real project test suite.

Command used:
```bash
C:/Projects/iwc-farm-stack-app/.venv/Scripts/python.exe -m pytest -q
```

Result in the last successful run:
```text
63 passed in 2.75s
```

Frontend validation commands:
```bash
cd frontend
npm run test
npm run build
```

Frontend validation status:
- auth route guard tests passed
- production build passed

## Notes
This implementation is intentionally minimal and aligned with the project’s existing style:
- no repository layer
- no architecture rewrite
- dependency injection remains the main pattern
- role checks are lightweight and explicit

For a future production hardening pass, the next logical improvements would be:
- password reset flow
- role-permission matrix
- stricter secret management via `.env` or secret manager
- request logging and audit trail
- stronger client-side session storage and CSRF/XSS mitigation strategy
