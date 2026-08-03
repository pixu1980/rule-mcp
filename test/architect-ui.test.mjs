// playwright a11y test for context-server interview UI
// Tests: add/remove repeatable groups, no infinite loops, no crashes
//
// Phase 2 Task 3: context-server now serves the CANONICAL wizard-spec.json +
// the shared rule-architect-web/interview.js (identical to architect-web)
// instead of its own stale placeholders.json + interview.js. This is an
// INTENTIONAL UX change (approved goal, not a regression): the MCP wizard
// gains Step 0 (Analysis Depth onboarding) and Step 1 (Domain Sketch) ahead
// of the former "Project Type & Stack" step, and the old `tier-btn` element
// no longer exists — ANALYSIS_DEPTH now renders as `skill-card`s at step 0.
// Live values below were verified against context-server on :19000 (not
// hardcoded from the old spec):
//   - default (standard tier): 15 step-dots (9 starter + 6 standard steps)
//   - deep tier: 20 step-dots (all steps)
//   - starter tier: 9 step-dots
//   - "Project Type & Stack" is now step index 2 (after Step 0 depth, Step 1
//     domain sketch), not step index 1.
import { test, expect } from "@playwright/test";

test.describe("rule-architect interview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:19000");
    await page.waitForSelector("[data-part='wizard-body']", { timeout: 10_000 });
  });

  test("loads 15 steps (standard tier) including step 0", async ({ page }) => {
    const dots = page.locator("[data-part='step-dot']");
    await expect(dots).toHaveCount(15); // step 0 + 9 starter + 5 more standard-tier sections
    // tier-btn no longer exists; depth is chosen via ANALYSIS_DEPTH skill-cards on step 0.
    await expect(page.locator("[data-part='tier-btn']")).toHaveCount(0);
    await expect(page.locator("[data-part='skill-card']")).toHaveCount(3); // starter/standard/deep
  });

  test("step 0 lets you choose analysis depth via ANALYSIS_DEPTH skill-cards", async ({ page }) => {
    await page.click("[data-part='skill-card'][data-key='deep']");
    await expect(page.locator("[data-part='step-dot']")).toHaveCount(20); // all sections
    await page.click("[data-part='skill-card'][data-key='starter']");
    await expect(page.locator("[data-part='step-dot']")).toHaveCount(9); // starter-tier sections only
  });

  test("project type & stack merged; tech cards filtered on same step", async ({ page }) => {
    // Step 0 (Analysis Depth) -> Step 1 (Domain Sketch) -> Step 2 (Project Type & Stack, merged)
    await page.click("[data-part='nav-btn'][data-direction='next']");
    await page.click("[data-part='nav-btn'][data-direction='next']");
    // Step 2: type cards + stack fields are on the SAME step
    // Click Web Application
    await page.click("[data-part='project-type-card']:first-child");
    // Wait for selection + re-render (stack fields filter by PROJECT_TYPE)
    await expect(page.locator("[data-part='project-type-card']:first-child"))
      .toHaveAttribute("data-state-selected", "true");
    // Tech cards should be filtered for webapp on the same page
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "SQLite" }).first()).toBeVisible();
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "tRPC" }).first()).toBeVisible();
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "Vanilla CSS" }).first()).toBeVisible();
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "PostgreSQL" })).toHaveCount(0);
  });

  test("add/remove repeatable group — no infinite loop", async ({ page }) => {
    // Navigate to the Project Glossary step — has repeatable groups
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 0 -> 1 (domain sketch)
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 1 -> 2 (project type & stack)
    await page.click("[data-part='project-type-card']:first-child");
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 3 (stack versions)
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 4 (architecture pattern)
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 5 (project identity)
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 6 (project glossary)

    // The Glossary step has THREE repeatable field groups (Domain Terms, Constraints,
    // Additional Details) — target one by its data-prefix to avoid a strict-mode
    // violation from the generic "[data-part='add-btn']" locator matching all three.
    const addButton = page.locator("[data-part='add-btn'][data-prefix='DOMAIN_TERMS']");
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click add multiple times
      const initialCount = await page.locator("[data-part='repeatable-group']").count();
      await addButton.click();
      await page.waitForTimeout(500);
      // Should have one more group
      const afterFirst = await page.locator("[data-part='repeatable-group']").count();
      expect(afterFirst).toBeGreaterThan(initialCount);

      // Click add again
      await addButton.click();
      await page.waitForTimeout(500);
      const afterSecond = await page.locator("[data-part='repeatable-group']").count();
      expect(afterSecond).toBeGreaterThan(afterFirst);

      // Click remove on the first Domain Terms group
      const removeButton = page.locator("[data-part='remove-btn'][data-prefix='DOMAIN_TERMS_1']");
      if (await removeButton.isVisible().catch(() => false)) {
        await removeButton.click();
        await page.waitForTimeout(500);
        // Should have fewer groups
        const afterRemove = await page.locator("[data-part='repeatable-group']").count();
        expect(afterRemove).toBeLessThan(afterSecond);
      }
    }
  });

  test("generate creates files — no crash", async ({ page }) => {
    // Quick fill and generate
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 0 -> 1 (domain sketch)
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 1 -> 2 (project type & stack)
    await page.click("[data-part='project-type-card']:first-child");

    // Navigate to last step
    for (let index = 0; index < 20; index++) {
      const nextButton = page.locator("[data-part='nav-btn'][data-direction='next']");
      if (!(await nextButton.isVisible().catch(() => false))) {break;}
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Should see submit buttons
    const generateButton = page.locator("[data-part='submit-btn']");
    const downloadButton = page.locator("[data-part='download-btn']");
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await expect(downloadButton).toBeVisible({ timeout: 5000 });

    // Click download (doesn't write to disk)
    await downloadButton.click();
    await page.waitForTimeout(2000);
    // Should show done screen
    await expect(page.locator("[data-part='result']")).toBeVisible({ timeout: 5000 });
  });

  test("Other project type shows architecture skills", async ({ page }) => {
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 0 -> 1 (domain sketch)
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 1 -> 2 (project type & stack)
    const cards = page.locator("[data-part='project-type-card']");
    const count = await cards.count();
    await cards.nth(count - 1).click(); // "Other / Custom"
    // ALL select-type fields render as skill-cards (no native <select>), so
    // PROJECT_TYPE_OTHER's revealed "Architecture Skill" group shows up as a
    // subtitle + skill-cards, not a native select[name='PROJECT_TYPE_OTHER'].
    await expect(page.locator("[data-part='subtitle']").filter({ hasText: "Architecture Skill" }))
      .toBeVisible({ timeout: 3000 });
    await expect(page.locator("[data-part='skill-card'][data-key='rule-architect']")).toBeVisible();
  });

  test("typing into a text field keeps focus and full value (no re-render focus loss)", async ({ page }) => {
    // Reach a step that has a free-text input.
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 0 -> 1 (domain sketch)
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 1 -> 2 (project type & stack)
    await page.click("[data-part='project-type-card']:first-child"); // reveals stack/version fields

    // Walk forward until a text/textarea input is visible inside the step body.
    let input = null;
    for (let index = 0; index < 20; index++) {
      const candidate = page
        .locator("[data-part='wizard-step'] input[type='text'], [data-part='wizard-step'] textarea")
        .first();
      if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
        input = candidate;
        break;
      }
      const next = page.locator("[data-part='nav-btn'][data-direction='next']");
      if (!(await next.isVisible().catch(() => false))) {break;}
      await next.click();
      await page.waitForTimeout(150);
    }
    expect(input, "expected a free-text input on some step").not.toBeNull();

    const id = await input.getAttribute("id");
    await input.fill(""); // clear any pre-filled default (e.g. version fields)
    // Type character-by-character — each keystroke fires `oninput` and, before the
    // fix, rebuilt the field DOM via innerHTML and dropped focus after char 1.
    await input.pressSequentially("hello-world", { delay: 20 });

    // Focus must remain on the SAME node, and the whole string must have landed.
    await expect(page.locator(`#${id}`)).toBeFocused();
    await expect(page.locator(`#${id}`)).toHaveValue("hello-world");
  });
});

// Phase-2 Task 2: architect-web's interview.js now ports context-server's rich
// project-type-card/tech-card taxonomy with PROJECT_TYPE filtering. Requires a
// standalone architect-web server running at ARCHITECT_WEB_URL (defaults to the
// temp port used for this task's manual verification):
//   node skills/rule-architect-web/server.mjs <tmpdir> --port 37031
const ARCHITECT_WEB_URL = process.env.ARCHITECT_WEB_URL || "http://localhost:37031";

test.describe("rule-architect-web interview (card taxonomy)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ARCHITECT_WEB_URL);
    await page.waitForSelector("[data-part='wizard-body']", { timeout: 10_000 });
  });

  test("tech-card set is filtered by PROJECT_TYPE (Postgres: backend-only)", async ({ page }) => {
    // Step 0 (Analysis Depth) -> Step 1 (Domain Sketch) -> Step 2 (Project Type & Stack)
    await page.click("[data-part='nav-btn'][data-direction='next']");
    await page.click("[data-part='nav-btn'][data-direction='next']");

    // Select Web Application, then a backend framework to reveal the DATABASE field.
    await page.click("[data-part='project-type-card'][data-key='webapp']");
    await expect(page.locator("[data-part='project-type-card'][data-key='webapp']"))
      .toHaveAttribute("data-state-selected", "true");
    await page.click("[data-part='tech-card'][data-key='express']");
    await expect(page.locator("[data-part='tech-card'][data-key='sqlite']")).toBeVisible();

    // webapp: PostgreSQL (backend-only) is filtered out; IndexedDB (no backend) is shown.
    await expect(page.locator("[data-part='tech-card'][data-key='postgresql']")).toHaveCount(0);
    await expect(page.locator("[data-part='tech-card'][data-key='indexeddb']")).toBeVisible();

    // Switch PROJECT_TYPE to Backend / API — the tech-card set must change accordingly.
    await page.click("[data-part='project-type-card'][data-key='backend']");
    await expect(page.locator("[data-part='project-type-card'][data-key='backend']"))
      .toHaveAttribute("data-state-selected", "true");
    await expect(page.locator("[data-part='tech-card'][data-key='postgresql']")).toBeVisible();
    await expect(page.locator("[data-part='tech-card'][data-key='indexeddb']")).toHaveCount(0);
  });

  test("typing into a text field keeps focus (architect-web, canonical spec)", async ({ page }) => {
    // Step 0 -> Step 1 (Domain Sketch) has a free-text input straight away.
    await page.click("[data-part='nav-btn'][data-direction='next']");
    const input = page
      .locator("[data-part='wizard-step'] input[type='text'], [data-part='wizard-step'] textarea")
      .first();
    await expect(input).toBeVisible({ timeout: 3000 });

    const id = await input.getAttribute("id");
    await input.fill("");
    await input.pressSequentially("hello-world", { delay: 20 });

    await expect(page.locator(`#${id}`)).toBeFocused();
    await expect(page.locator(`#${id}`)).toHaveValue("hello-world");
  });

  // Phase 7 Task 1: the right-panel Summary view is now a grouped, human-friendly
  // rendering (section label -> field label -> resolved value) instead of a raw
  // alphabetical KEY->value table + JSON dump.
  test("summary panel groups filled fields under human labels with resolved select values", async ({ page }) => {
    // Step 0 (Analysis Depth) -> Step 1 (Domain Sketch): fill the project name.
    await page.click("[data-part='nav-btn'][data-direction='next']");
    const nameInput = page.locator("#f-PROJECT_NAME_SKETCH");
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.fill("My RPG Builder");

    // Step 1 -> Step 2 (Project Type & Stack): pick Web Application (a select field).
    await page.click("[data-part='nav-btn'][data-direction='next']");
    await page.click("[data-part='project-type-card'][data-key='webapp']");
    await expect(page.locator("[data-part='project-type-card'][data-key='webapp']"))
      .toHaveAttribute("data-state-selected", "true");

    const panel = page.locator("[data-part='summary-panel']");

    // Grouped under the section's human label ("Step 1 — " prefix stripped).
    await expect(panel.locator("[data-part='summary-group-title']").filter({ hasText: "Domain Sketch" })).toBeVisible();
    await expect(panel.locator("[data-part='summary-label']").filter({ hasText: "Project Name" })).toBeVisible();
    await expect(panel.locator("[data-part='summary-value']").filter({ hasText: "My RPG Builder" })).toBeVisible();

    await expect(panel.locator("[data-part='summary-group-title']").filter({ hasText: "Project Type & Stack" })).toBeVisible();
    // Select values resolve to the option's human label, not the raw key.
    await expect(panel.locator("[data-part='summary-value']").filter({ hasText: "Web Application" })).toBeVisible();
    await expect(panel.locator("[data-part='summary-value']").filter({ hasText: /^webapp$/ })).toHaveCount(0);

    // No developer-facing dump: no raw JSON <pre>, no internal *_count keys, no raw field keys.
    await expect(panel.locator("pre")).toHaveCount(0);
    const panelText = await panel.innerText();
    expect(panelText).not.toMatch(/_count/);
    expect(panelText).not.toContain("PROJECT_NAME_SKETCH");
    expect(panelText).not.toContain("PROJECT_TYPE");
  });

  // Phase 7 Task 2: a [Summary • Files] segmented control switches the panel
  // body. Files debounce-POSTs the current answers to /api/download and
  // renders a file-tab strip + the selected file's raw content — a live
  // preview of exactly what generation would produce, no markdown renderer.
  test("Files toggle shows a live, switchable file preview; toggling back restores Summary", async ({ page }) => {
    // Step 0 -> Step 1 (Domain Sketch): fill the project name so it flows into generated files.
    await page.click("[data-part='nav-btn'][data-direction='next']");
    const nameInput = page.locator("#f-PROJECT_NAME_SKETCH");
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.fill("My RPG Builder");

    const panel = page.locator("[data-part='summary-panel']");
    const summaryTab = panel.locator("[data-part='panel-tab']").filter({ hasText: "Summary" });
    const filesTab = panel.locator("[data-part='panel-tab']").filter({ hasText: "Files" });

    // Summary is the default active view.
    await expect(summaryTab).toHaveAttribute("data-state-active", "true");
    await expect(filesTab).toHaveAttribute("data-state-active", "");

    // Switch to Files — triggers a debounced (~400ms) POST /api/download.
    await filesTab.click();
    await expect(filesTab).toHaveAttribute("data-state-active", "true");

    const agentsTab = panel.locator("[data-part='file-tab']").filter({ hasText: "AGENTS.md" });
    await expect(agentsTab).toBeVisible({ timeout: 5000 }); // waits out the debounce + fetch
    await expect(agentsTab).toHaveAttribute("data-state-active", "true"); // AGENTS.md is the default selection

    const fileContent = panel.locator("[data-part='file-content']");
    await expect(fileContent).toContainText("My RPG Builder", { timeout: 5000 });
    const agentsContent = await fileContent.innerText();

    // Click a different file-tab — content switches to that file's own text.
    const readmeTab = panel.locator("[data-part='file-tab']").filter({ hasText: "README.md" });
    await expect(readmeTab).toBeVisible();
    await readmeTab.click();
    await expect(readmeTab).toHaveAttribute("data-state-active", "true");
    await expect(agentsTab).toHaveAttribute("data-state-active", "");
    await expect(fileContent).toContainText("My RPG Builder", { timeout: 5000 });
    await expect(async () => {
      expect(await fileContent.innerText()).not.toBe(agentsContent);
    }).toPass({ timeout: 5000 });

    // Debounce: typing a new value while Files is active eventually updates the preview.
    await nameInput.fill("Second Name Xyz");
    await expect(fileContent).toContainText("Second Name Xyz", { timeout: 5000 });

    // Toggle back to Summary — the grouped, human-labeled summary reappears.
    await summaryTab.click();
    await expect(summaryTab).toHaveAttribute("data-state-active", "true");
    await expect(panel.locator("[data-part='summary-group-title']").filter({ hasText: "Domain Sketch" })).toBeVisible();
    await expect(panel.locator("[data-part='file-content']")).toHaveCount(0);
  });

  // Fix round 1: switching to Summary while a Files debounce is still pending
  // must cancel it — Summary is purely client-side and must never trigger
  // /api/download, even for a request that was scheduled just before the toggle.
  test("toggling to Summary cancels a pending Files debounce — no /api/download fires afterward", async ({ page }) => {
    let downloadCalls = 0;
    page.on("request", r => {
      if (r.method() === "POST" && r.url().includes("/api/download")) {downloadCalls++;}
    });

    await page.click("[data-part='nav-btn'][data-direction='next']");
    const nameInput = page.locator("#f-PROJECT_NAME_SKETCH");
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.fill("My RPG Builder");

    const panel = page.locator("[data-part='summary-panel']");
    const summaryTab = panel.locator("[data-part='panel-tab']").filter({ hasText: "Summary" });
    const filesTab = panel.locator("[data-part='panel-tab']").filter({ hasText: "Files" });

    // Enter Files and let its initial debounced fetch resolve.
    await filesTab.click();
    await expect(panel.locator("[data-part='file-tab']").filter({ hasText: "AGENTS.md" })).toBeVisible({ timeout: 5000 });

    // Type (schedules a new ~400ms debounced fetch), then immediately toggle
    // back to Summary — well within the debounce window.
    await nameInput.fill("Should Not Fetch This");
    const callsAtToggle = downloadCalls;
    await summaryTab.click();
    await expect(summaryTab).toHaveAttribute("data-state-active", "true");

    // Wait past the debounce window; the pending fetch must have been cancelled.
    await page.waitForTimeout(700);
    expect(downloadCalls).toBe(callsAtToggle);
    // And the panel is genuinely showing Summary, not a stale Files render.
    await expect(panel.locator("[data-part='file-content']")).toHaveCount(0);
    await expect(panel.locator("[data-part='summary-group-title']").filter({ hasText: "Domain Sketch" })).toBeVisible();
  });

  // Final-review fix wave — Finding 1 (IMPORTANT): renderSummaryRow/renderSummaryBody
  // interpolated field VALUES into innerHTML without escaping. Values are NOT
  // trusted (user free-text + /api/init-values -> detectProjectValues, which can
  // seed PROJECT_NAME from an untrusted repo's package.json name / README H1), so
  // a crafted value could inject a live element (e.g. <img onerror=...>) that
  // executes on the same localhost origin that also serves the disk-writing
  // /api/generate endpoint. This must render as inert escaped text, never as a
  // live DOM node or handler.
  test("summary panel escapes an HTML/script payload typed into a text field (XSS)", async ({ page }) => {
    const payload = '<img src=x onerror="window.__xss=1">';

    // Step 0 -> Step 1 (Domain Sketch) has the PROJECT_NAME_SKETCH text input.
    await page.click("[data-part='nav-btn'][data-direction='next']");
    const nameInput = page.locator("#f-PROJECT_NAME_SKETCH");
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.fill(payload);

    const panel = page.locator("[data-part='summary-panel']");
    // Summary is the default view and updates live on every `track()` call, but
    // explicitly (re-)open it to match how a user would inspect the value.
    const summaryTab = panel.locator("[data-part='panel-tab']").filter({ hasText: "Summary" });
    await summaryTab.click();
    await expect(summaryTab).toHaveAttribute("data-state-active", "true");

    const valueElement = panel.locator("[data-part='summary-value']").filter({ hasText: "img" });
    await expect(valueElement).toBeVisible({ timeout: 3000 });

    // (a) The payload must appear as literal, escaped TEXT — not be parsed as markup.
    await expect(valueElement).toHaveText(payload);

    // (b) No injected element or handler actually ran.
    expect(await page.evaluate(() => globalThis.__xss)).toBeUndefined();
    await expect(panel.locator("[data-part='summary-value'] img")).toHaveCount(0);
  });
});

// Phase 7 Task 3: a11y. The [Summary • Files] segmented control and the file
// tabs must be reachable via accessible ROLE + NAME (not just data-part), and
// the panel must be a genuine `complementary` landmark (a real <aside>, not a
// styled <div>). No @axe-core/playwright dependency is installed and none is
// added here — this asserts roles/names via the existing Playwright API only.
// Run against BOTH live servers: they serve the identical canonical
// interview.js, so panel a11y semantics must not drift between them.
test.describe("panel a11y (both servers serve the identical interview.js)", () => {
  const SERVER_URLS = ["http://localhost:19000", ARCHITECT_WEB_URL];

  for (const url of SERVER_URLS) {
    test(`segmented control + file tabs are accessible buttons; panel is complementary (${url})`, async ({ page }) => {
      await page.goto(url);
      await page.waitForSelector("[data-part='wizard-body']", { timeout: 10_000 });

      // The panel must be reachable as a `complementary` landmark — i.e. a real <aside>.
      const panel = page.getByRole("complementary");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("data-part", "summary-panel");
      expect(await panel.evaluate(element => element.tagName)).toBe("ASIDE");

      // Segmented control: two buttons with accessible names "Summary"/"Files"
      // reachable by role+name; the active one is distinguishable via
      // `data-state-active` (Summary is the default active view).
      const summaryTab = panel.getByRole("button", { name: "Summary", exact: true });
      const filesTab = panel.getByRole("button", { name: "Files", exact: true });
      await expect(summaryTab).toBeVisible();
      await expect(filesTab).toBeVisible();
      await expect(summaryTab).toHaveAttribute("data-state-active", "true");
      await expect(filesTab).toHaveAttribute("data-state-active", "");

      // Switching view: file tabs must also be accessible buttons named by
      // filename, with the same active-state distinguishing convention.
      await filesTab.click();
      await expect(filesTab).toHaveAttribute("data-state-active", "true");
      await expect(summaryTab).toHaveAttribute("data-state-active", "");

      const agentsTab = panel.getByRole("button", { name: "AGENTS.md", exact: true });
      await expect(agentsTab).toBeVisible({ timeout: 5000 });
      await expect(agentsTab).toHaveAttribute("data-state-active", "true");
    });
  }
});
