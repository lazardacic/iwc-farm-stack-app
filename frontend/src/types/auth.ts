export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: "bearer";
}
