#!/usr/bin/env bash
# Runs every check on the app. Usage: tests/run.sh [path/to/index.html]
# Needs Node and Playwright with Chromium (preinstalled in Claude Code cloud sessions).
set -u
cd "$(dirname "$0")"
PAGE="$(realpath "${1:-../index.html}")"
run(){ echo "== $1"; shift; timeout 600 node "$@" 2>&1 | grep -vE '^\s*$' | tail -25; }
run "carte: ogni carta in ogni esercizio, generatori" cards.js "$PAGE"
run "flussi: importazione, conversazione, pronuncia, grammatica, impostazioni" flows.js "$PAGE"
run "esercizi a scelta e loro ripetizioni" choices.js "$PAGE"
run "schermate su iPhone e Mac" screens.js "$PAGE"
run "sessione completa" session.js "$PAGE"
run "salvataggio e riapertura" save.js "$PAGE"
run "risposta durante il caricamento dell'account" slow-load.js "$PAGE"
run "lettura a pagine e tastiera iPhone" paging-keyboard.js "$PAGE"
run "simulazione di 120 giorni" simulate.js "$PAGE" 120 1
