[🇧🇷 Português](README.pt-BR.md)

# 📬 Agent Inbox

**https://caixa-agente.vercel.app**
(Mirror: https://lucasgabrieldevgg.github.io/caixa-agente — same boxes, same codes.)


> Send messages and instructions to your AI agent **while it runs the task** — no interrupting, no pausing, no re-prompting. It reads at the next checkpoint, incorporates it and confirms back by marking it as **seen**.

[![ci](https://github.com/lucasgabrieldevgg/caixa-agente/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasgabrieldevgg/caixa-agente/actions/workflows/ci.yml) [![site](https://img.shields.io/badge/site-caixa--agente.vercel.app-000000)](https://caixa-agente.vercel.app) [![database](https://img.shields.io/badge/database-free%20firebase-ffca28)](https://firebase.google.com) [![secrets](https://img.shields.io/badge/secrets-zero-16a34a)](#-architecture) [![cost](https://img.shields.io/badge/cost-%240-success)](#)

---

## 🤔 The problem it solves

Autonomous agents (Claude Code, GPT agents, etc.) run long tasks. If a new idea hits you halfway through — a fix, a tweak, a "forget what I said" — the options were: interrupt the agent (lose momentum) or wait for it to finish (lose the idea).

**The inbox solves it:** you write a block at any time; the agent checks the box at every checkpoint, runs whatever is new and **only wraps up when the box is empty**. No message goes unanswered.

## 🚀 How to use (3 steps, no sign-up)

1. **Create your box** on the [home page](https://caixa-agente.vercel.app) → you get an `XXXX-XXXX` code and your exclusive link;
2. **Send the ready-made message to your agent** (the site generates it for you, 🔗 button) — once, and it's valid forever;
3. **Write blocks** whenever you want. The agent reads, runs and marks **✓ SEEN** — you follow along in real time.

### The message the agent receives (template)

```
You have an INBOX where I send instructions at any time, without interrupting your work.
1) Read the full protocol now (valid forever): https://caixa-agente.vercel.app/?c=YOUR-CODE#terminal
2) If you can only read plain text: your blocks are at https://caixa-agente-default-rtdb.firebaseio.com/boxes/YOUR-CODE/blocos.json and your memory counter at …/visto.json (everything with id ≤ seen is already done; after finishing up to block #N, PUT the number N into visto.json). Check both again every ~5 steps (~10 min), and ALWAYS check one last time before finishing.
3) Never wait or idle because of the box: reading is quick; if it's offline, keep going.
```

## ✨ Features

- **📬 Your boxes on the home page** — the browser keeps up to 6 boxes (on your machine only, `localStorage`) with **live pending counts and countdowns**;
- **✏️ Edit / 🗑 delete block** — only until the agent sees it; then it becomes immutable 🔒;
- **🗑 Delete box** — only while nothing has been processed (seen = 0); deletions use an **atomic transaction** server-side (no race with the seen counter);
- **♻️ Reset box** — clears messages and the agent's memory **keeping the same code/link** (the message already sent to the agent still works); unlimited use while the box is within its retention window;
- **💬 Agent comment** — optional extra: after finishing a block, the agent leaves its own comment (doubt, decision, result) attached to the instruction;
- **📈 Progress feed** — its own tab where the agent posts what it's doing and what it achieved at each checkpoint;
- **⚙️ Settings** — each extra has its own level **off / simple / medium / full**, changeable at any time (the agent re-reads the config at every checkpoint and obeys on the next one). Honest warnings: with extras on, the agent writes more — **it may spend extra tokens from your AI** — and if your agent **already comments/reports on its own** in its environment, leave it *off* (the extras exist for those who don't get that feedback);
- **🖥️ AI terminal** — `?c=YOUR-CODE#terminal`: text version of the panel with live blocks, retention window and the full protocol (for agents with a browser) — with a ← back button to the panel;
- **Pure REST** — agents without a browser use simple `GET`/`PUT`, **no token, no login**;
- **🌙 Light/dark theme**, mobile-first, zero setup for anyone.

## 🏗️ Architecture

```
                 ┌─────────────── Firebase RTDB (free, no pause) ───────────┐
 site (Pages) ───▶  boxes/2EJ5-NR8Q/{blocos:"…", visto:1, criado:…}        │
 agent (REST) ───▶  boxes/P3MD-7WV2/{…}   boxes/XXXX-XXXX/{…}              │
                 └──────────── public rules, ZERO secrets ─────────────────┘
```

| Piece | What it is |
|---|---|
| **Site** | single `index.html` in this repo → GitHub Pages (forever, free) |
| **Database** | Firebase Realtime Database — one node per box, isolated |
| **Security** | **database rules** (root blocked; only `boxes/$code` public) — no token/key/secret anywhere |
| **Writes** | transactions (safe concurrent append) |
| **Cost** | $0 |

### Data format

`blocos` is an append-only string, one instruction per line:

```
#AGENT INBOX — append-only. Do not delete old lines.
#1 | 2026-09-13 19:40 | Start by building the landing page
#2 | 2026-09-13 19:52 | Change the button to blue
```

`visto` (seen) is a number: **everything with id ≤ seen has been processed**. It's the agent's memory.

The box also carries `nome` (optional name), `ttlHoras` (retention window chosen at creation, 24–168), `criado` (last-activity stamp — the thing that renews the window), `cfg` `{coment, comentNivel, prog, progNivel}` (extras with independent levels; older boxes with a single `nivel` keep working), `coment/{id}` (agent comments per block) and `progresso` (the progress feed, same `#N | date | level | text` format).

### The API the agent uses (REST, no credentials)

```bash
# read the messages (whole string)
curl https://caixa-agente-default-rtdb.firebaseio.com/boxes/CODE/blocos.json

# read the memory (number)
curl https://caixa-agente-default-rtdb.firebaseio.com/boxes/CODE/visto.json

# mark seen (after finishing up to block #N)
curl -X PUT "https://caixa-agente-default-rtdb.firebaseio.com/boxes/CODE/visto.json" \
     -H "Content-Type: application/json" -d "N"
```

## 🧠 The agent protocol (summary)

The full protocol lives in the terminal (`#terminal`) — this is the summary:

1. **Start:** reads `visto` + `blocos`, builds the pending list (id > seen);
2. **Periodic checkpoint:** every ~5 steps (~10 min), re-reads; with news, incorporates it with minimal replanning (never starts over); without news, carries on;
3. **Mandatory final checkpoint:** runs pending items → marks seen → re-reads → repeats until a full read brings nothing new. **Only then does it finish**;
4. **Extras (if enabled in settings):** reads `cfg/{code}/cfg.json`; with comments on, PUTs to `coment/N.json` after finishing each block; with progress on, appends a line to `progresso.json` and renews the activity stamp;
5. **Anti-deadlock:** checking the box is never an excuse to wait in a loop;
6. **Resilience:** the box being down never kills the task.

## 🕒 Data retention (you pick the window)

- **At creation you choose when the box deletes itself**: 24h, 48h, 3 days or **7 days (max)** — stored on the box node (`ttlHoras`);
- **The window renews with every message** (and every reset): it's counted from the **last activity**, not from creation — an active box never expires;
- Two cleanup layers, both respecting each box's window: (1) opening an expired box deletes it on the spot; (2) the GitHub Action `Limpeza de caixas antigas` sweeps the database **every day** and removes expired ones;
- **Privacy by design**: executed instructions are garbage — here they self-destruct;
- To change the global cap: `TTL_DIAS` in `index.html`, in `scripts/limpeza.mjs` and in the workflow.

## 🔒 Security and isolation

- **No secrets on the site** — protection comes from database rules, not tokens (nothing to leak);
- **Whoever has the code, accesses the box** — codes are 8 characters with no ambiguous letters (practically impossible to guess); treat the link as your box's key;
- **Boxes never mix** — each code is an isolated node; blocks, seen and memory never cross;
- Don't write secrets (passwords, API keys) in blocks — use references ("use the key from my file X").

## 🎨 Identity — TELETYPE STATION

Zero AI-face: no lavender gradient, no radial glow, no frosted glass, no Inter. The station looks like what it is:

- **Light = telegraph paper** (cream `#ece6d6`, ink `#211d12`, hard offset shadows — teletype receipt);
- **Dark = green-phosphor CRT** (`#12140f` + green `#3ee07a`, subtle hard-stop texture scanlines);
- **VT323** on the display (vintage-terminal headings) · **IBM Plex Mono** on body (true monospace, since the product lives on `#N | date | text`);
- Amber stripe = **NEW** block · green stripe = **SEEN** (the tape moves, the line stays open);
- Palette index and components at the top of `index.html` (`TELETYPE STATION` comment).

## 🧪 Tests

```
npm install && npm test
```

**97 checks** run in jsdom **with no network and no Firebase** (the app falls into demo mode by itself): protocol format (`#N | date | text`, seen, pending), `XXXX-XXXX` codes without ambiguous characters, REST addresses, the generated agent protocol, block/terminal rendering, persistent theme, HTML escaping — plus the **anti-slop guard**: if anyone reintroduces a gradient with transition, radial glow, AI purple, gradient title, blinking dot or a real secret, the suite breaks the CI.

## 📄 Files

| File | What it is |
|---|---|
| `index.html` | The whole site (home, visual panel, terminal, Firebase logic) |
| `tests/suite.cjs` | Consistency suite (41 checks, jsdom, no network) |
| `.github/workflows/ci.yml` | CI: `npm test` + anti-slop hygiene on every push |
| `.github/workflows/limpeza.yml` | Daily action deleting expired boxes (7-day TTL) |
| `scripts/limpeza.mjs` | The daily cleanup script |
| `LICENSE` | MIT |
| `.nojekyll` | Speeds up Pages |

---

Built for the task **"Communicating with agents without interrupting them"** — for questions or tweaks, open an issue. 📬
