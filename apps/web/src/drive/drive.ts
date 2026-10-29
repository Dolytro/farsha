import { API_KEY } from "./google";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

/** Marks files created by Canvylo so they can be listed (drive.file only sees these anyway). */
const APP_PROP = { canvylo: "1" };

export class DriveError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const auth = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` });

async function check(res: Response): Promise<Response> {
  if (res.ok) return res;
  let detail = res.statusText;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    detail = body.error?.message ?? detail;
  } catch {
    /* non-JSON error body */
  }
  throw new DriveError(detail || `Drive request failed (${res.status})`, res.status);
}

export interface DriveUser {
  name: string;
  email: string;
  photo: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function getUser(token: string): Promise<DriveUser> {
  const res = await check(await fetch(`${API}/about?fields=user(displayName,emailAddress,photoLink)`, { headers: auth(token) }));
  const { user } = (await res.json()) as { user: { displayName: string; emailAddress: string; photoLink?: string } };
  return { name: user.displayName, email: user.emailAddress, photo: user.photoLink ?? null };
}

export async function createFile(token: string, name: string, bytes: Uint8Array): Promise<DriveFile> {
  const boundary = `canvylo${Math.random().toString(36).slice(2)}`;
  const meta = { name, mimeType: "application/octet-stream", appProperties: APP_PROP };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    bytes as BlobPart,
    `\r\n--${boundary}--`,
  ]);
  const res = await check(
    await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id,name,modifiedTime`, {
      method: "POST",
      headers: { ...auth(token), "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }),
  );
  return (await res.json()) as DriveFile;
}

export async function updateFile(token: string, id: string, bytes: Uint8Array): Promise<DriveFile> {
  const res = await check(
    await fetch(`${UPLOAD}/files/${id}?uploadType=media&fields=id,name,modifiedTime`, {
      method: "PATCH",
      headers: { ...auth(token), "Content-Type": "application/octet-stream" },
      body: bytes as BodyInit,
    }),
  );
  return (await res.json()) as DriveFile;
}

export async function renameFile(token: string, id: string, name: string): Promise<void> {
  await check(
    await fetch(`${API}/files/${id}`, {
      method: "PATCH",
      headers: { ...auth(token), "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
}

export async function listFiles(token: string): Promise<DriveFile[]> {
  const q = encodeURIComponent("appProperties has { key='canvylo' and value='1' } and trashed=false");
  const res = await check(
    await fetch(`${API}/files?q=${q}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,modifiedTime)`, { headers: auth(token) }),
  );
  return ((await res.json()) as { files: DriveFile[] }).files;
}

/** Download file bytes: with the owner's token, or anonymously with the API key for link-shared files. */
export async function downloadFile(id: string, token?: string | null): Promise<Uint8Array> {
  const url = token ? `${API}/files/${id}?alt=media` : `${API}/files/${id}?alt=media&key=${API_KEY ?? ""}`;
  const res = await check(await fetch(url, { headers: token ? auth(token) : undefined }));
  return new Uint8Array(await res.arrayBuffer());
}

/** Is "anyone with the link can view" currently on for this file? */
export async function isLinkShared(token: string, id: string): Promise<boolean> {
  const res = await check(await fetch(`${API}/files/${id}/permissions?fields=permissions(id,type,role)`, { headers: auth(token) }));
  const { permissions } = (await res.json()) as { permissions: { type: string; role: string }[] };
  return permissions.some((p) => p.type === "anyone");
}

export async function setLinkShared(token: string, id: string, shared: boolean): Promise<void> {
  if (shared) {
    await check(
      await fetch(`${API}/files/${id}/permissions`, {
        method: "POST",
        headers: { ...auth(token), "Content-Type": "application/json" },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      }),
    );
  } else {
    // The "anyone with the link" permission always has this id.
    const res = await fetch(`${API}/files/${id}/permissions/anyoneWithLink`, { method: "DELETE", headers: auth(token) });
    if (!res.ok && res.status !== 404) await check(res);
  }
}
