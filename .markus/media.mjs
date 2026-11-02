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

/** どの AI から使っているか（連携の画面に出す名前） */
function deviceName() {
  const agent = process.env.CLAUDECODE ? "Claude Code" : Object.keys(process.env).some((k) => k.startsWith("CODEX_")) ? "Codex" : null;
  return agent ? `${os.hostname()}（${agent}）` : os.hostname();
}

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), redirect: "error" });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

class NeedsApproval extends Error {}

function askApproval(p) {
  return new NeedsApproval(
    [
      "この端末を Markus に連携する必要があります。人に次のとおり伝えてください:",
      "",
      `  ブラウザで ${p.verification_uri_complete} を開き、コード ${p.user_code} がこの画面と同じか確かめて「許可」を押してください。`,
      "",
      `許可されたら、同じコマンドをもう一度実行してください（コードは ${new Date(p.expires_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} まで有効です）。`,
    ].join("\n"),
  );
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
    if (json.code === "access_denied") console.error("連携が拒否されました。新しいコードを出します。");
  }

  const { ok, json } = await postJson(`${origin}/api/device/code`, { name: deviceName() });
  if (!ok) throw new Error(`連携を始められません: ${json.error ?? "Markus に届きません"}`);
  const p = { ...json, expires_at: Date.now() + json.expires_in * 1000 };
  save(pendingFile(host), JSON.stringify(p));
  throw askApproval(p);
}

async function fetchOne(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`URL ではありません: ${raw}`);
  }
  // トークンは Markus のメディアにだけ送る（ほかのサイトに渡さない）
  if (url.protocol !== "https:" || !HOSTS.has(url.hostname)) throw new Error(`Markus のメディアの URL ではありません（そのまま curl などで取ってください）: ${raw}`);
  const m = /^\/p\/(prj_[a-z0-9]+)\/([0-9a-f]{32})\/([^/]+)$/.exec(url.pathname);
  if (!m) throw new Error(`Markus のメディアの URL の形ではありません: ${raw}`);
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
    if (res.status === 403) throw new Error(`見られません（あなたはこのプロジェクトのメンバーではありません）: ${raw}`);
    if (res.status === 404) throw new Error(`見つかりません（消されたか、URL が違います）: ${raw}`);
    throw new Error(`取れません（${res.status} ${message}）: ${raw}`);
  }
  throw new Error(`取れません（連携し直しても読めません）: ${raw}`);
}

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error("使い方: node .markus/media.mjs <URL>…");
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
