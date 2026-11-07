#!/usr/bin/env node
// この clone を最新にする（Markus が配る。書き換えないでください）。
//   node .markus/sync.mjs
// Markus の Web と同期しているか（.git/markus-sync）を見て、やり方を選ぶ（AGENTS.md の 1）。
//   同期していない: git pull --rebase --autostash
//   同期している:   git fetch → git reset @{u}（--hard は付けない）。Web の中身はもうファイルにあるので、git の記録だけを合わせる
// 終了コード:
//   0 最新にした
//   1 できなかった（出たメッセージのとおりに直す）
//   2 同期していて、push していないコミットがある（reset するとコミットが無くなるので止まる。人に聞く）

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Web は 30 秒ごとに目印を書き直す。これより古ければ、ブラウザが落ちただけで同期していない */
const MARKER_MAX_AGE = 2 * 60 * 1000;
const ASK_HUMAN = 2;
const IN_PROGRESS = ["rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD"];

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

// 途中で reset すると、rebase・マージの続きができなくなる
if (inProgress()) stop(t.inProgress);
if (!git("rev-parse", "--verify", "--quiet", "@{u}").ok) stop(t.noUpstream);

if (syncing()) {
  must("fetch");
  const unpushed = must("log", "--oneline", "@{u}..");
  if (unpushed) stop(t.unpushed(unpushed), ASK_HUMAN);
  must("reset", "--quiet", "@{u}");
  restoreScripts();
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
