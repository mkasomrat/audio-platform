import "server-only";

const HOSTS = ["www.dropbox.com", "dropbox.com", "dl.dropboxusercontent.com"];

export function normalizeDropbox(input: string): { share: string; stream: string } | { error: string } {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return { error: "That isn't a valid link." }; }
  if (u.protocol !== "https:") return { error: "The link must start with https://" };
  if (!HOSTS.includes(u.hostname)) return { error: "Only Dropbox links are accepted (dropbox.com)." };
  const share = u.toString();
  u.searchParams.delete("dl"); u.searchParams.set("raw", "1");
  return { share, stream: u.toString() };
}

export type Probe = { ok: boolean; status: number; contentType: string; supportsRange: boolean; total: number | null; isOgg: boolean; isOpus: boolean; htmlPage: boolean; sizeMatches: boolean | null; problems: string[] };

// Fetches only the first 2 KB with a Range header, following redirects, and inspects what really comes back.
export async function probeStream(url: string, expectedSize: number | null): Promise<Probe> {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15000);
  const problems: string[] = [];
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-2047" }, redirect: "follow", signal: ctrl.signal, cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "";
    const cr = res.headers.get("content-range");
    const total = cr ? Number(cr.split("/")[1]) || null : Number(res.headers.get("content-length")) || null;
    const chunks: Uint8Array[] = []; let got = 0;
    const reader = res.body?.getReader();
    while (reader && got < 2048) { const { done, value } = await reader.read(); if (done || !value) break; chunks.push(value); got += value.length; }
    await reader?.cancel().catch(() => {});
    const head = Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, 2048);
    const isOgg = head.subarray(0, 4).toString("latin1") === "OggS", isOpus = isOgg && head.indexOf("OpusHead", 0, "latin1") >= 0;
    const htmlPage = /text\/html/i.test(contentType) || head.subarray(0, 15).toString("latin1").toLowerCase().includes("<!doctype html");
    const supportsRange = res.status === 206;
    if (!res.ok) problems.push(`Dropbox answered with status ${res.status}. The link may be wrong, private or temporarily blocked.`);
    if (htmlPage) problems.push("Dropbox returned a web page instead of the audio file. Check the link and its sharing setting.");
    else if (res.ok && !isOgg) problems.push("The linked file is not an OGG audio file.");
    else if (res.ok && !isOpus) problems.push("The file is OGG but does not contain Opus audio.");
    if (res.ok && !supportsRange) problems.push("Range requests are not supported, so seeking may not work.");
    const sizeMatches = expectedSize && total ? total === expectedSize : null;
    if (sizeMatches === false) problems.push(`File size differs from the recording (${total} vs ${expectedSize} bytes). It may be a different file.`);
    return { ok: res.ok && isOpus && !htmlPage, status: res.status, contentType, supportsRange, total, isOgg, isOpus, htmlPage, sizeMatches, problems };
  } catch (e: any) {
    return { ok: false, status: 0, contentType: "", supportsRange: false, total: null, isOgg: false, isOpus: false, htmlPage: false, sizeMatches: null, problems: [e?.name === "AbortError" ? "Dropbox did not answer within 15 seconds." : "Couldn't reach Dropbox from the server."] };
  } finally { clearTimeout(timer); }
}
