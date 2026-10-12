#!/usr/bin/env bash
run node scripts/check-reliability.mjs
run node --test tests/reliability-scanner.selftest.mjs
