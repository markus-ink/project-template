#!/usr/bin/env node
// この clone を最新にする（Markus が配る。書き換えないでください）。
//   node .markus/sync.mjs
// Markus の Web と同期しているか（.git/markus-sync）を見て、やり方を選ぶ（AGENTS.md の 1）。
//   同期していない: git pull --rebase --autostash
//   同期している:   git fetch → git reset @{u}（--hard は付けない）。Web の中身はもうファイルにあるので、git の記録だけを合わせる
// その前に、Markus の規約（AGENTS.md の印の間・.markus/agents/）とスクリプトが今の版かを確かめ、古ければ Markus に書き換えてもらってから取り込む。
// Markus に届かなければ、確かめずに進む
// 終了コード:
//   0 最新にした
//   1 できなかった（出たメッセージのとおりに直す）
//   2 同期していて、push していないコミットがある（reset するとコミットが無くなるので止まる。人に聞く）

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Web は 30 秒ごとに目印を書き直す。これより古ければ、ブラウザが落ちただけで同期していない */
const MARKER_MAX_AGE = 2 * 60 * 1000;
const ASK_HUMAN = 2;
const IN_PROGRESS = ["rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD"];
/** 規約を確かめる先。Markus が配るときに、このプロジェクトの Markus のもの（開発なら media-dev.markus.ink）に書き換える */
const API_ORIGIN = "https://media.markus.ink";
/** 今の版の印を取るのを待つ時間。届かなければ確かめずに進む */
const CHECK_TIMEOUT = 3000;
/** 規約を書き換えてもらうのを待つ時間（Markus が GitHub にコミットを作る） */
const UPDATE_TIMEOUT = 30_000;
/** 同期しているとき、書き換えた規約を Web がこのフォルダに書くのを待つ時間 */
const WRITE_TIMEOUT = 20_000;
const BEGIN = /^<!-- markus:begin v\d+ -->$/;
const END = "<!-- markus:end -->";

const root = fileURLToPath(new URL("..", import.meta.url));

/** 出す文言の言語。.markus/config.yml の language（無い・知らない言語なら英語）。依存が無いので YAML は読まずに行で見る */
function language() {
  try {
    const v = /^language:[ \t]*["']?([A-Za-z-]+)/m.exec(fs.readFileSync(path.join(root, ".markus/config.yml"), "utf8"))?.[1].toLowerCase().split("-")[0];
    return v === "ja" ? "ja" : "en";
  } catch {
    return "en";
  }
}

const MESSAGES = {
  en: {
    gitFailed: (cmd) => `git ${cmd} failed. Nothing was changed.`,
    inProgress: "A rebase or merge is in progress, so nothing was done. Finish or abort it, then run this again.",
    noUpstream: "The current branch has no remote branch it tracks. Nothing was changed.",
    unpushed: (list) => `There are commits that haven't been pushed, so git reset @{u} was not run (it would lose them). Ask a person.\n${list}`,
    draft: (n) => ` There ${n === 1 ? "is 1 uncommitted change" : `are ${n} uncommitted changes`}. They are what someone is writing on the web, so don't discard, revert, or stash them.`,
    synced: (head, note) => `Syncing: matched ${head}.${note}`,
    rebaseStopped: "The rebase stopped on a conflict. Fix the conflict and run git rebase --continue.",
    pullFailed: "git pull failed. Nothing was changed.",
    stashConflict: (files) => `Updated, but restoring your uncommitted changes hit a conflict. They are still in git stash. Fix the conflict markers in the files below, then run git reset and git stash drop.\n${files}`,
    updated: (head) => `Up to date (${head}).`,
    rulesUpdated: "The Markus rules and scripts in this repository were out of date, so Markus updated them. Read AGENTS.md again before you start.",
    checkFailed: (error) => `Couldn't check whether the Markus rules are up to date (${error}). Continuing with the rules in this clone.`,
    updateFailed: (error) => `The Markus rules in this clone are out of date, but Markus couldn't update them (${error}). Continuing with the rules in this clone.`,
    notWritten: "Markus updated the Markus rules, but Markus on the web hasn't written them to this folder yet. Wait a moment, then run node .markus/sync.mjs again.",
  },
  ja: {
    gitFailed: (cmd) => `git ${cmd} ができませんでした。何も変えていません。`,
    inProgress: "rebase かマージの途中なので、何もしませんでした。終わらせるか止めてから、もう一度実行してください。",
    noUpstream: "今のブランチに、追っているリモートのブランチがありません。何も変えていません。",
    unpushed: (list) => `push していないコミットがあるので、git reset @{u} をしませんでした（するとコミットが無くなります）。人に聞いてください。\n${list}`,
    draft: (n) => ` まだコミットしていない変更が ${n} 件あります。Web で書いている途中の内容なので、消さない・戻さない・stash しないでください。`,
    synced: (head, note) => `同期中: ${head} に合わせました。${note}`,
    rebaseStopped: "rebase が衝突で止まっています。衝突を直して git rebase --continue してください。",
    pullFailed: "git pull ができませんでした。何も変えていません。",
    stashConflict: (files) => `最新にしましたが、書きかけの変更を戻すときに衝突しました。書きかけは git stash に残っています。次のファイルの衝突の印を直して、git reset と git stash drop をしてください。\n${files}`,
    updated: (head) => `最新にしました（${head}）。`,
    rulesUpdated: "このリポジトリの Markus の規約とスクリプトが古かったので、Markus が最新にしました。始める前に AGENTS.md を読み直してください。",
    checkFailed: (error) => `Markus の規約が最新か確かめられませんでした（${error}）。この clone の規約のまま進めます。`,
    updateFailed: (error) => `この clone の Markus の規約が古いですが、Markus に最新にしてもらえませんでした（${error}）。この clone の規約のまま進めます。`,
    notWritten: "Markus の規約を最新にしましたが、Markus の Web がまだこのフォルダに書いていません。少し待ってから、もう一度 node .markus/sync.mjs を実行してください。",
  },
};
const t = MESSAGES[language()];

function git(...args) {
  // AI の端末ではパスワードを打てないので、聞かれたら待たずに失敗させる
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  const output = [r.stdout, r.stderr, r.error?.message].filter(Boolean).join("\n").trim();
  return { ok: r.status === 0, stdout: (r.stdout ?? "").trim(), output };
}

function stop(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function must(...args) {
  const r = git(...args);
  if (!r.ok) stop(`${t.gitFailed(args[0])}\n${r.output}`);
  return r.stdout;
}

const gitDir = must("rev-parse", "--absolute-git-dir");
const inProgress = () => IN_PROGRESS.some((name) => fs.existsSync(path.join(gitDir, name)));

function syncing() {
  try {
    return Date.now() - fs.statSync(path.join(gitDir, "markus-sync")).mtimeMs < MARKER_MAX_AGE;
  } catch {
    return false;
  }
}

/** Web は .markus/ のスクリプトを書かないので、reset だけでは古いまま（無ければ無いまま）になる。Web で変えられないファイルなので、書きかけは混ざらない */
function restoreScripts() {
  const scripts = must("ls-tree", "--name-only", "HEAD", ".markus/").split("\n").filter((p) => p.endsWith(".mjs"));
  if (scripts.length) must("checkout", "HEAD", "--", ...scripts);
}

/** この clone の GitHub のリポジトリ（owner/repo）。origin を先に見る。GitHub でなければ null（media.mjs と同じ決め方） */
function githubRepo() {
  const remotes = git("remote", "-v")
    .stdout.split("\n")
    .map((line) => line.split(/\s+/))
    .filter(([name, url]) => name && url)
    .sort(([a], [b]) => (b === "origin") - (a === "origin"));
  for (const [, url] of remotes) {
    const m = /github\.com[:/]+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(url);
    if (m) return `${m[1]}/${m[2]}`;
  }
  return null;
}

function readText(file) {
  try {
    return fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
}

/**
 * 手元の規約とスクリプトの印。Markus の今の版の印と同じ計算（AGENTS.md の印の間（印の行も入れる）と paths の中身を、
 * 改行を \n にして「パス \0 中身」を \0 でつなぎ、SHA-256 の先頭 16 文字）。ファイルが無い・印が 1 組でなければ null
 */
function localHash(paths) {
  const lines = readText("AGENTS.md")?.split("\n");
  if (!lines) return null;
  const begins = lines.flatMap((l, i) => (BEGIN.test(l) ? [i] : []));
  const ends = lines.flatMap((l, i) => (l === END ? [i] : []));
  if (begins.length !== 1 || ends.length !== 1 || ends[0] < begins[0]) return null;
  const parts = [`AGENTS.md\0${lines.slice(begins[0], ends[0] + 1).join("\n")}`];
  for (const p of paths) {
    const text = readText(p);
    if (text === null) return null;
    parts.push(`${p}\0${text}`);
  }
  return crypto.createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 16);
}

async function api(pathAndQuery, init, timeout) {
  const res = await fetch(`${API_ORIGIN}${pathAndQuery}`, { ...init, signal: AbortSignal.timeout(timeout), redirect: "error" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const reason = (e) => (e?.name === "TimeoutError" ? "timeout" : (e?.cause?.code ?? e?.message ?? String(e)));

/**
 * Markus の規約とスクリプトが今の版かを確かめ、古ければ Markus に書き換えてもらう（pull の前に。書き換えたコミットを一緒に取り込む）。
 * 書き換えてもらったら、手元が今の版になったかを返す関数。書き換えなかった・確かめられなかったら null（そのまま進む）
 */
async function checkRules() {
  const repo = githubRepo();
  if (!repo) return null;
  let latest;
  try {
    latest = await api("/api/agents", {}, CHECK_TIMEOUT);
  } catch (e) {
    console.log(t.checkFailed(reason(e)));
    return null;
  }
  const paths = (Array.isArray(latest?.paths) ? latest.paths : []).filter((p) => typeof p === "string" && p.startsWith(".markus/") && !p.split("/").includes(".."));
  const hashes = Object.values(latest?.hashes ?? {});
  const current = () => hashes.includes(localHash(paths));
  if (current()) return null;
  try {
    const res = await api(`/api/agents?repo=${encodeURIComponent(repo)}`, { method: "POST" }, UPDATE_TIMEOUT);
    if (!res?.updated) return null;
  } catch (e) {
    console.log(t.updateFailed(reason(e)));
    return null;
  }
  console.log(t.rulesUpdated);
  return current;
}

// 途中で reset すると、rebase・マージの続きができなくなる
if (inProgress()) stop(t.inProgress);
if (!git("rev-parse", "--verify", "--quiet", "@{u}").ok) stop(t.noUpstream);

const rulesCurrent = await checkRules();

if (syncing()) {
  must("fetch");
  const unpushed = must("log", "--oneline", "@{u}..");
  if (unpushed) stop(t.unpushed(unpushed), ASK_HUMAN);
  must("reset", "--quiet", "@{u}");
  restoreScripts();
  // 規約のファイル（AGENTS.md・.markus/agents/）は Web が書く。書き終わるまで待つ（古いまま読ませない）
  if (rulesCurrent) {
    const until = Date.now() + WRITE_TIMEOUT;
    while (!rulesCurrent()) {
      if (Date.now() > until) stop(t.notWritten);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  const changes = must("status", "--porcelain").split("\n").filter(Boolean).length;
  console.log(t.synced(must("rev-parse", "--short", "HEAD"), changes ? t.draft(changes) : ""));
} else {
  const r = git("pull", "--rebase", "--autostash");
  if (!r.ok) stop(`${inProgress() ? t.rebaseStopped : t.pullFailed}\n${r.output}`);
  // 書きかけを戻すときの衝突では、pull は成功を返す（ファイルに衝突の印が残り、書きかけは stash に残る）
  const conflicts = must("diff", "--name-only", "--diff-filter=U", "-z").split("\0").filter(Boolean);
  if (conflicts.length) stop(t.stashConflict(conflicts.join("\n")));
  console.log(t.updated(must("rev-parse", "--short", "HEAD")));
}
