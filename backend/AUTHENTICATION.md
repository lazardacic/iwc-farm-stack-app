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

## What is implemented

### 1. User model and validation
The user schema includes:
- email validation via Pydantic `EmailStr`
- password minimum length
- default role: `user`
- `UserRole` as literal union: `"user" | "admin"`

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
- expiration: 60 minutes
- secret: from environment variable `JWT_SECRET`

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

## Database integration
The project keeps using MongoDB collections via dependency injection, without introducing a repository layer.

Dependencies in:
- [backend/database/dependencies.py](./database/dependencies.py)

Collections used:
- `users`
- `destinations`

## Testing
The backend uses a test database named `farm_test_db` and overrides dependency injections in tests.

This ensures that integration tests do not touch the production database.

Test configuration:
- [backend/tests/conftest.py](./tests/conftest.py)

Relevant test groups:
- auth login, register, me, authorization
- destination API integration tests

## Required environment variable
Set this before running the application:

```bash
JWT_SECRET=your_super_secure_secret_key_here
```

For production, the secret should be long and random. For HS256, a key length of at least 32 bytes is recommended.

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

## Notes
This implementation is intentionally minimal and aligned with the project’s existing style:
- no repository layer
- no architecture rewrite
- dependency injection remains the main pattern
- role checks are lightweight and explicit

For a future production hardening pass, the next logical improvements would be:
- refresh tokens
- password reset flow
- role-permission matrix
- stricter secret management via `.env` or secret manager
- request logging and audit trail
