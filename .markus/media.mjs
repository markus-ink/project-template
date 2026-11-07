#!/usr/bin/env node
// Markus に置いた画像・動画・PDF を取る・置く（Markus が配る。書き換えないでください）。
//   node .markus/media.mjs <URL>…            一時ディレクトリに保存して、保存した場所を 1 行ずつ出す。
//   node .markus/media.mjs upload <ファイル>…  この clone の Markus のプロジェクトに置いて、URL を 1 行ずつ出す（ページには自分で書く）。
// 画像は Markus のプロジェクトのメンバーしか見られないので、初めてのときはこの端末を Markus に連携する。
// そのときは開く URL とコードを出して止まる（終了コード 2）。人に伝え、Markus で「許可」を押してもらってから、同じコマンドをもう一度実行する。
// トークンは ~/.config/markus/ に置き、Markus のメディアの URL（media.markus.ink）にだけ付ける。
// 置くには、そのプロジェクトの Editor 以上のロールが要る。どのプロジェクトかは、この clone の GitHub のリポジトリ（git remote）で決める。

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOSTS = new Set(["media.markus.ink", "media-dev.markus.ink"]);
/** 置く先。Markus が配るときに、このプロジェクトの Markus のもの（開発なら media-dev.markus.ink）に書き換える */
const UPLOAD_ORIGIN = "https://media.markus.ink";
/** 1 ファイルの上限（種類ごとの上限は Markus が確かめる） */
const MAX_UPLOAD = 20 * 1024 * 1024;
const NEEDS_APPROVAL = 2;
const root = fileURLToPath(new URL("..", import.meta.url));

const configDir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "markus");
const outDir = path.join(os.tmpdir(), "markus-media");
const tokenFile = (host) => path.join(configDir, `${host}.token`);
const pendingFile = (host) => path.join(configDir, `${host}.pending.json`);

function save(file, text) {
  fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, text, { mode: 0o600 });
}

const read = (file) => {
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return null;
  }
};

const remove = (file) => fs.rmSync(file, { force: true });

/** 出す文言の言語。このスクリプトがあるリポジトリの .markus/config.yml の language（無い・知らない言語なら英語）。依存が無いので YAML は読まずに行で見る */
function language() {
  const v = /^language:[ \t]*["']?([A-Za-z-]+)/m.exec(read(new URL("config.yml", import.meta.url)) ?? "")?.[1].toLowerCase().split("-")[0];
  return v === "ja" ? "ja" : "en";
}

const MESSAGES = {
  en: {
    timeLocale: "en-US",
    device: (host, agent) => `${host} (${agent})`,
    approve: (url, code, until) => [
      "This device needs to be linked to Markus. Tell a person the following:",
      "",
      `  Open ${url} in a browser, check that the code ${code} matches the one on that screen, and click "Allow".`,
      "",
      `Once it's allowed, run the same command again (the code is valid until ${until}).`,
    ],
    denied: "The link was denied. Showing a new code.",
    cantStart: (why) => `Can't start linking: ${why}`,
    unreachable: "can't reach Markus",
    notUrl: (raw) => `Not a URL: ${raw}`,
    notMedia: (raw) => `Not a Markus media URL (fetch it with curl or similar): ${raw}`,
    badShape: (raw) => `Not in the form of a Markus media URL: ${raw}`,
    forbidden: (raw) => `Can't view it (you are not a member of this project): ${raw}`,
    notFound: (raw) => `Not found (it was deleted, or the URL is wrong): ${raw}`,
    failed: (status, message, raw) => `Can't fetch it (${status} ${message}): ${raw}`,
    stillUnauthorized: (raw) => `Can't fetch it (still can't read it after linking again): ${raw}`,
    usage: "Usage: node .markus/media.mjs <URL>…  (fetch)\n       node .markus/media.mjs upload <file>…  (upload)",
    noFile: (file) => `File not found: ${file}`,
    tooLarge: (file) => `Too large (up to 20MB): ${file}`,
    noRepo: "Can't tell which Markus project this is: this clone has no GitHub remote (git remote -v)",
    notProject: (repo) => `${repo} isn't a Markus project you're a member of. Ask a person to check the project and that they linked the device with their own account`,
    roleRequired: "Uploading requires the Editor role or higher in this project. Ask a person",
    uploadFailed: (status, message, file) => `Can't upload it (${status} ${message}): ${file}`,
    stillUnauthorizedUpload: (file) => `Can't upload it (still rejected after linking again): ${file}`,
  },
  ja: {
    timeLocale: "ja-JP",
    device: (host, agent) => `${host}（${agent}）`,
    approve: (url, code, until) => [
      "この端末を Markus に連携する必要があります。人に次のとおり伝えてください:",
      "",
      `  ブラウザで ${url} を開き、コード ${code} がこの画面と同じか確かめて「許可」を押してください。`,
      "",
      `許可されたら、同じコマンドをもう一度実行してください（コードは ${until} まで有効です）。`,
    ],
    denied: "連携が拒否されました。新しいコードを出します。",
    cantStart: (why) => `連携を始められません: ${why}`,
    unreachable: "Markus に届きません",
    notUrl: (raw) => `URL ではありません: ${raw}`,
    notMedia: (raw) => `Markus のメディアの URL ではありません（そのまま curl などで取ってください）: ${raw}`,
    badShape: (raw) => `Markus のメディアの URL の形ではありません: ${raw}`,
    forbidden: (raw) => `見られません（あなたはこのプロジェクトのメンバーではありません）: ${raw}`,
    notFound: (raw) => `見つかりません（消されたか、URL が違います）: ${raw}`,
    failed: (status, message, raw) => `取れません（${status} ${message}）: ${raw}`,
    stillUnauthorized: (raw) => `取れません（連携し直しても読めません）: ${raw}`,
    usage: "使い方: node .markus/media.mjs <URL>…（取る）\n       node .markus/media.mjs upload <ファイル>…（置く）",
    noFile: (file) => `ファイルがありません: ${file}`,
    tooLarge: (file) => `大きすぎます（20MB まで）: ${file}`,
    noRepo: "どの Markus のプロジェクトか分かりません。この clone に GitHub のリモートがありません（git remote -v）",
    notProject: (repo) => `${repo} は、あなたが入っている Markus のプロジェクトではありません。プロジェクトと、連携した人のアカウントが合っているか、人に確かめてください`,
    roleRequired: "置くには、このプロジェクトの Editor 以上のロールが要ります。人に聞いてください",
    uploadFailed: (status, message, file) => `置けません（${status} ${message}）: ${file}`,
    stillUnauthorizedUpload: (file) => `置けません（連携し直しても断られます）: ${file}`,
  },
};
const t = MESSAGES[language()];

/** どの AI から使っているか（連携の画面に出す名前） */
function deviceName() {
  const agent = process.env.CLAUDECODE ? "Claude Code" : Object.keys(process.env).some((k) => k.startsWith("CODEX_")) ? "Codex" : null;
  return agent ? t.device(os.hostname(), agent) : os.hostname();
}

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), redirect: "error" });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

class NeedsApproval extends Error {}

function askApproval(p) {
  const until = new Date(p.expires_at).toLocaleTimeString(t.timeLocale, { hour: "2-digit", minute: "2-digit" });
  return new NeedsApproval(t.approve(p.verification_uri_complete, p.user_code, until).join("\n"));
}

/** トークン。無ければ連携を進める（コードを作る・許可されていれば受け取る）。まだ許可されていなければ NeedsApproval */
async function tokenFor(origin, host) {
  const saved = read(tokenFile(host));
  if (saved) return saved;

  const pending = read(pendingFile(host));
  if (pending) {
    const p = JSON.parse(pending);
    const { ok, json } = await postJson(`${origin}/api/device/token`, { device_code: p.device_code });
    if (ok && json.access_token) {
      save(tokenFile(host), json.access_token);
      remove(pendingFile(host));
      return json.access_token;
    }
    if (json.code === "authorization_pending") throw askApproval(p);
    // 拒否された・期限が切れた。新しいコードを作り直す
    remove(pendingFile(host));
    if (json.code === "access_denied") console.error(t.denied);
  }

  const { ok, json } = await postJson(`${origin}/api/device/code`, { name: deviceName() });
  if (!ok) throw new Error(t.cantStart(json.error ?? t.unreachable));
  const p = { ...json, expires_at: Date.now() + json.expires_in * 1000 };
  save(pendingFile(host), JSON.stringify(p));
  throw askApproval(p);
}

async function fetchOne(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(t.notUrl(raw));
  }
  // トークンは Markus のメディアにだけ送る（ほかのサイトに渡さない）
  if (url.protocol !== "https:" || !HOSTS.has(url.hostname)) throw new Error(t.notMedia(raw));
  const m = /^\/p\/(prj_[a-z0-9]+)\/([0-9a-f]{32})\/([^/]+)$/.exec(url.pathname);
  if (!m) throw new Error(t.badShape(raw));
  url.search = "";
  url.hash = "";

  // 同じ URL の中身は変わらないので、一度取ったものは取り直さない
  const out = path.join(outDir, `${m[2]}-${m[3]}`);
  if (fs.existsSync(out)) return out;

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await tokenFor(url.origin, url.hostname);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: "error" });
    if (res.ok) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      return out;
    }
    const message = (await res.text()).trim();
    // 期限が切れた・解除された。捨てて連携し直す
    if (res.status === 401) {
      remove(tokenFile(url.hostname));
      continue;
    }
    if (res.status === 403) throw new Error(t.forbidden(raw));
    if (res.status === 404) throw new Error(t.notFound(raw));
    throw new Error(t.failed(res.status, message, raw));
  }
  throw new Error(t.stillUnauthorized(raw));
}

/** この clone の GitHub のリポジトリ（owner/repo）。origin を先に見る */
function githubRepo() {
  const out = spawnSync("git", ["-C", root, "remote", "-v"], { encoding: "utf8" });
  const remotes = (out.stdout ?? "")
    .split("\n")
    .map((line) => line.split(/\s+/))
    .filter(([name, url]) => name && url)
    .sort(([a], [b]) => (b === "origin") - (a === "origin"));
  for (const [, url] of remotes) {
    const m = /github\.com[:/]+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(url);
    if (m) return `${m[1]}/${m[2]}`;
  }
  throw new Error(t.noRepo);
}

/**
 * JPEG の撮った場所などのメタデータ（Exif・XMP の APP1、IPTC の APP13）を外す。Markus の Web がアップロードの前に書き直すのと同じ目的（08「ブラウザでの下ごしらえ」）。
 * 向き（Orientation）だけは、外すと写真が横に倒れるので、それだけの Exif を入れ直す。JPEG でなければそのまま
 */
function stripJpegMetadata(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return b;
  const parts = [b.subarray(0, 2)];
  let orientation = 1;
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // ここから後は画像のデータ
    if (marker === 0xda) break;
    const end = i + 2 + ((b[i + 2] << 8) | b[i + 3]);
    if (end > b.length) return b;
    const segment = b.subarray(i, end);
    if (marker === 0xe1) orientation = exifOrientation(segment.subarray(4)) ?? orientation;
    else if (marker !== 0xed) parts.push(segment);
    i = end;
  }
  if (orientation !== 1) parts.splice(parts[1]?.[1] === 0xe0 ? 2 : 1, 0, orientationSegment(orientation));
  parts.push(b.subarray(i));
  return Buffer.concat(parts);
}

/** Exif の APP1 の中身（"Exif\0\0" から）の Orientation。無ければ null */
function exifOrientation(data) {
  if (data.length < 14 || data.toString("latin1", 0, 6) !== "Exif\0\0") return null;
  const tiff = data.subarray(6);
  const le = tiff.toString("latin1", 0, 2) === "II";
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  try {
    const ifd = u32(4);
    for (let n = 0, count = u16(ifd); n < count; n++) {
      const entry = ifd + 2 + n * 12;
      if (u16(entry) === 0x0112) {
        const v = u16(entry + 8);
        return v >= 1 && v <= 8 ? v : null;
      }
    }
  } catch {
    // 壊れた Exif は、向きが無いのと同じ
  }
  return null;
}

/** Orientation だけの Exif の APP1 */
function orientationSegment(orientation) {
  const body = Buffer.concat([
    Buffer.from("Exif\0\0", "latin1"),
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0]),
  ]);
  return Buffer.concat([Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 0xff]), body]);
}

let repo;

async function uploadOne(file) {
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) throw new Error(t.noFile(file));
  if (stat.size > MAX_UPLOAD) throw new Error(t.tooLarge(file));
  const bytes = stripJpegMetadata(fs.readFileSync(file));
  repo ??= githubRepo();
  const origin = UPLOAD_ORIGIN;
  const host = new URL(origin).hostname;

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await tokenFor(origin, host);
    const res = await fetch(`${origin}/api/media?repo=${encodeURIComponent(repo)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(path.basename(file)) },
      body: bytes,
      redirect: "error",
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.url) return json.url;
    // 期限が切れた・解除された。捨てて連携し直す
    if (res.status === 401) {
      remove(tokenFile(host));
      continue;
    }
    if (json.code === "repo_not_project") throw new Error(t.notProject(repo));
    if (json.code === "role_required") throw new Error(t.roleRequired);
    throw new Error(t.uploadFailed(res.status, json.error ?? "", file));
  }
  throw new Error(t.stillUnauthorizedUpload(file));
}

const args = process.argv.slice(2);
const upload = args[0] === "upload";
const targets = upload ? args.slice(1) : args;
if (!targets.length) {
  console.error(t.usage);
  process.exit(1);
}
let failed = false;
for (const target of targets) {
  try {
    console.log(await (upload ? uploadOne(target) : fetchOne(target)));
  } catch (e) {
    if (e instanceof NeedsApproval) {
      console.log(e.message);
      process.exit(NEEDS_APPROVAL);
    }
    console.error(e.message);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
