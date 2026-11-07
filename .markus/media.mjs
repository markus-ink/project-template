#!/usr/bin/env node
// Markus に置いた画像・動画・PDF を取る（Markus が配る。書き換えないでください）。
//   node .markus/media.mjs <URL>…
// 一時ディレクトリに保存して、保存した場所を 1 行ずつ出す。
// 画像は Markus のプロジェクトのメンバーしか見られないので、初めてのときはこの端末を Markus に連携する。
// そのときは開く URL とコードを出して止まる（終了コード 2）。人に伝え、Markus で「許可」を押してもらってから、同じコマンドをもう一度実行する。
// トークンは ~/.config/markus/ に置き、Markus のメディアの URL（media.markus.ink）にだけ付ける。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOSTS = new Set(["media.markus.ink", "media-dev.markus.ink"]);
const NEEDS_APPROVAL = 2;

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
    usage: "Usage: node .markus/media.mjs <URL>…",
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
    usage: "使い方: node .markus/media.mjs <URL>…",
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

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error(t.usage);
  process.exit(1);
}
let failed = false;
for (const raw of urls) {
  try {
    console.log(await fetchOne(raw));
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
