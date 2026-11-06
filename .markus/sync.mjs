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
  if (!r.ok) stop(`git ${args[0]} ができませんでした。何も変えていません。\n${r.output}`);
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
if (inProgress()) stop("rebase かマージの途中なので、何もしませんでした。終わらせるか止めてから、もう一度実行してください。");
if (!git("rev-parse", "--verify", "--quiet", "@{u}").ok) stop("今のブランチに、追っているリモートのブランチがありません。何も変えていません。");

if (syncing()) {
  must("fetch");
  const unpushed = must("log", "--oneline", "@{u}..");
  if (unpushed) stop(`push していないコミットがあるので、git reset @{u} をしませんでした（するとコミットが無くなります）。人に聞いてください。\n${unpushed}`, ASK_HUMAN);
  must("reset", "--quiet", "@{u}");
  restoreScripts();
  const changes = must("status", "--porcelain").split("\n").filter(Boolean).length;
  const note = changes ? ` まだコミットしていない変更が ${changes} 件あります。Web で書いている途中の内容なので、消さない・戻さない・stash しないでください。` : "";
  console.log(`同期中: ${must("rev-parse", "--short", "HEAD")} に合わせました。${note}`);
} else {
  const r = git("pull", "--rebase", "--autostash");
  if (!r.ok) stop(`${inProgress() ? "rebase が衝突で止まっています。衝突を直して git rebase --continue してください。" : "git pull ができませんでした。何も変えていません。"}\n${r.output}`);
  // 書きかけを戻すときの衝突では、pull は成功を返す（ファイルに衝突の印が残り、書きかけは stash に残る）
  const conflicts = must("diff", "--name-only", "--diff-filter=U", "-z").split("\0").filter(Boolean);
  if (conflicts.length) stop(`最新にしましたが、書きかけの変更を戻すときに衝突しました。書きかけは git stash に残っています。次のファイルの衝突の印を直して、git reset と git stash drop をしてください。\n${conflicts.join("\n")}`);
  console.log(`最新にしました（${must("rev-parse", "--short", "HEAD")}）。`);
}
