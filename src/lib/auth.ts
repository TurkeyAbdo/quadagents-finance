import crypto from "crypto";
import { cookies } from "next/headers";
import { query } from "./db/postgres";
import { SESSION_COOKIE } from "./session-cookie";

export interface AppUser {
  id: string;
  email: string;
}

interface SessionPayload extends AppUser {
  exp: number;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

function sessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "dev-session-secret");

  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return secret;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input: string): Buffer {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(value: string): string {
  return base64Url(
    crypto.createHmac("sha256", sessionSecret()).update(value).digest()
  );
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function createSessionToken(user: AppUser): string {
  const payload: SessionPayload = {
    id: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = base64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(sign(body), signature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(body).toString("utf8")) as SessionPayload;
    if (!payload.id || !payload.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(
      password,
      salt,
      PASSWORD_ITERATIONS,
      PASSWORD_KEY_LENGTH,
      PASSWORD_DIGEST
    )
    .toString("hex");
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, iterationsRaw, salt, expectedHash] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterationsRaw || !salt || !expectedHash) return false;

  const iterations = Number(iterationsRaw);
  const actualHash = crypto
    .pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");
  return safeEqual(actualHash, expectedHash);
}

export function setSessionCookie(user: AppUser) {
  cookies().set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function readSessionPayload(): SessionPayload | null {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = readSessionPayload();
  if (!session) return null;

  const rows = await query<AppUser>(
    "select id, email from app_users where id = $1 limit 1",
    [session.id]
  );
  return rows[0] ?? null;
}

export async function createUser(email: string, password: string): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email is required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  try {
    const rows = await query<AppUser>(
      "insert into app_users (email, password_hash) values ($1, $2) returning id, email",
      [normalizedEmail, hashPassword(password)]
    );
    return rows[0];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new Error("An account with this email already exists.");
    }
    throw error;
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await query<AppUser & { password_hash: string }>(
    "select id, email, password_hash from app_users where email = $1 limit 1",
    [normalizedEmail]
  );
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error("Invalid email or password.");
  }
  return { id: user.id, email: user.email };
}
