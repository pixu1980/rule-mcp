// test/architect-server-security.test.mjs
//
// F7: harden the two architect interview servers (rule-architect-web and
// the MCP-spawned context-server). Three independent holes:
//
//   1. Path traversal — the static handler built a file path from the request
//      pathname with no containment check. `new URL()` normalization makes the
//      classic ../ vector hard to reach over HTTP, but the file-resolution step
//      must fail closed regardless (future refactor, non-URL input, symlinks).
//      containWithin() is that primitive and carries the security weight here.
//   2. All-interfaces bind — `listen(PORT)` with no host binds 0.0.0.0/::, so
//      the wizard was reachable from the whole LAN. Must bind loopback.
//   3. Wildcard CORS — `Access-Control-Allow-Origin: *` let ANY website the
//      user visits read these endpoints while the server ran. The UI is
//      same-origin and needs no CORS header at all.
//
// Importing the server modules must NOT start a listener (main-guarded), or
// this test process would leak an open handle and never exit.
import test from "node:test";
import assert from "node:assert/strict";
// eslint-disable-next-line no-unused-vars
import { resolve, sep, join } from "node:path";
import { once } from "node:events";
import { containWithin } from "../skills/rule-architect/static-file.mjs";
import * as webServer from "../skills/rule-architect-web/server.mjs";
import * as contextServer from "../skills/rule-architect/assets/context-server.mjs";

// ── containWithin: the containment primitive ──────────────────────────────

test("containWithin returns the resolved path for a file inside the root", () => {
  const root = resolve("/srv/app/assets");
  assert.equal(containWithin(join(root, "index.html"), [root]), join(root, "index.html"));
  assert.equal(containWithin(root, [root]), root, "the root itself is contained");
});

test("containWithin returns null for a path that escapes the root via ../", () => {
  const root = resolve("/srv/app/assets");
  assert.equal(containWithin(join(root, "..", "..", "etc", "passwd"), [root]), null);
  assert.equal(containWithin(join(root, "../../../../etc/passwd"), [root]), null);
});

test("containWithin blocks the sibling-prefix trick (assets vs assetsX)", () => {
  const root = resolve("/srv/app/assets");
  // /srv/app/assetsX starts with '/srv/app/assets' as a string but is NOT
  // inside it — the `+ sep` guard is what rejects this.
  assert.equal(containWithin(resolve("/srv/app/assetsX/secret"), [root]), null);
});

test("containWithin accepts a file under any of several roots", () => {
  const a = resolve("/srv/a");
  const b = resolve("/srv/b");
  assert.equal(containWithin(join(b, "x.js"), [a, b]), join(b, "x.js"));
  assert.equal(containWithin(resolve("/srv/c/x.js"), [a, b]), null);
});

// ── Server hardening: bind host + no CORS + traversal 404 ─────────────────

const SERVERS = [
  { name: "rule-architect-web", mod: webServer },
  { name: "context-server", mod: contextServer },
];

test("both servers export a loopback BIND_HOST and a createServer factory", () => {
  for (const { name, mod } of SERVERS) {
    assert.equal(mod.BIND_HOST, "127.0.0.1", `${name} must bind loopback, not all interfaces`);
    assert.equal(typeof mod.createServer, "function", `${name} must export createServer`);
  }
});

async function withServer(module_, function_) {
  const server = module_.createServer(process.cwd());
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await function_(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

for (const { name, mod } of SERVERS) {
  test(`${name}: responses carry no wildcard CORS header`, async () => {
    await withServer(mod, async (base) => {
      const res = await fetch(`${base}/api/templates`);
      assert.notEqual(
        res.headers.get("access-control-allow-origin"),
        "*",
        "a wildcard ACAO lets any website read this local server"
      );
      await res.text();
    });
  });

  test(`${name}: a legit static file is still served`, async () => {
    await withServer(mod, async (base) => {
      const res = await fetch(`${base}/`);
      assert.equal(res.status, 200, "the index page must still serve");
      const body = await res.text();
      assert.ok(body.length > 0, "index body is non-empty");
    });
  });

  test(`${name}: a traversal request never returns a file outside the served root`, async () => {
    await withServer(mod, async (base) => {
      // URL normalization already collapses ../, but assert the property end
      // to end: the response must never be the contents of a system file.
      const res = await fetch(`${base}/../../../../../../etc/passwd`);
      const body = await res.text();
      assert.doesNotMatch(body, /root:.*:0:0:/, "must not leak /etc/passwd");
    });
  });

  test(`${name}: an oversized POST body is rejected (413), not buffered unbounded`, async () => {
    await withServer(mod, async (base) => {
      const huge = "x".repeat(3 * 1024 * 1024); // 3 MiB > the 2 MiB cap
      const res = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { PROJECT_NAME: huge } }),
      });
      assert.equal(res.status, 413, "an oversized body must be refused, not accumulated");
      await res.text();
    });
  });

  test(`${name}: a normal POST body is still accepted`, async () => {
    await withServer(mod, async (base) => {
      const res = await fetch(`${base}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { PROJECT_NAME: "Acme" } }),
      });
      assert.equal(res.status, 200, "a normal body must still work");
      const json = await res.json();
      assert.ok(json.ok && Array.isArray(json.files), "download returns files");
    });
  });
}
