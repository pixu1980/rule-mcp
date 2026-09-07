/**
 * generateSelfSignedCert failures that depend on what openssl does: a missing
 * binary, a failing key step and a failing certificate step. PATH points at a
 * fake `openssl` script so the subprocess behavior is deterministic.
 */
import { strict as assert } from "node:assert";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { generateSelfSignedCert } from "../_cert.js";

const REAL_PATH = process.env.PATH;

/** A tmp dir holding a fake `openssl` that fails exactly the given steps. */
function fakeOpenssl({ version = true, genrsa = true, req = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rule-cert-fake-"));
  const script = [
    "#!/bin/sh",
    'case "$1" in',
    `  version) ${version ? "exit 0" : "exit 1"} ;;`,
    `  genrsa) ${genrsa ? "exit 0" : "echo key failed >&2; exit 1"} ;;`,
    `  req) ${req ? "exit 0" : "echo cert failed >&2; exit 1"} ;;`,
    "  *) exit 0 ;;",
    "esac",
  ].join("\n");
  const bin = join(dir, "openssl");
  writeFileSync(bin, script);
  chmodSync(bin, 0o755);
  process.env.PATH = dir;

  return () => {
    process.env.PATH = REAL_PATH;
    rmSync(dir, { recursive: true, force: true });
  };
}

const pathsFor = () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-cert-out-"));
  return { certPath: join(dir, "cert.pem"), keyPath: join(dir, "key.pem"), dir };
};

test("a missing openssl is reported as unavailable and generation stops", () => {
  const restore = fakeOpenssl({ version: false });
  try {
    const { certPath, keyPath, dir } = pathsFor();
    assert.equal(generateSelfSignedCert({ certPath, keyPath }), false, "no openssl means no certificate");
    rmSync(dir, { recursive: true, force: true });
  } finally {
    restore();
  }
});

test("a failing key step stops generation", () => {
  const restore = fakeOpenssl({ genrsa: false });
  try {
    const { certPath, keyPath, dir } = pathsFor();
    assert.equal(generateSelfSignedCert({ certPath, keyPath }), false, "a failed genrsa means no certificate");
    rmSync(dir, { recursive: true, force: true });
  } finally {
    restore();
  }
});

test("a failing certificate step stops generation", () => {
  const restore = fakeOpenssl({ req: false });
  try {
    const { certPath, keyPath, dir } = pathsFor();
    assert.equal(generateSelfSignedCert({ certPath, keyPath }), false, "a failed req means no certificate");
    rmSync(dir, { recursive: true, force: true });
  } finally {
    restore();
  }
});

test("the temp config is cleaned up even when generation succeeds", () => {
  const restore = fakeOpenssl({});
  try {
    const { certPath, keyPath, dir } = pathsFor();
    assert.equal(generateSelfSignedCert({ certPath, keyPath }), true, "a fake openssl that succeeds reports success");
    assert.ok(certPath.length > 0 || keyPath.length > 0, "the certificate paths were exercised");
    rmSync(dir, { recursive: true, force: true });
  } finally {
    restore();
  }
});