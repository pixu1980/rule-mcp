# rule-mcp

<section data-part="hero">
<p><strong>Deterministic skills for every AI coding agent, without calling an LLM.</strong></p>
<p>An MCP server that routes free-text requests to the right skill, serves styleguides and templates as tools and resources, and validates generated code with guardrails. Same behavior behind Claude, GPT, Gemini, Llama, or Qwen. Local-first. Model-agnostic.</p>
<ul data-part="stats">
<li><strong>81 skills</strong></li>
<li><strong>102 tools</strong></li>
<li><strong>170 resources</strong></li>
<li><strong>38 prompts</strong></li>
<li><strong>41 slash commands</strong></li>
</ul>
<p data-part="cta"><a href="docs/01-getting-started.md">Get started</a> <a href="docs/README.md">Browse reference</a></p>
</section>

<section data-part="flow">
<h2>How it works</h2>
<ol>
<li><strong>Route.</strong> A free-text request reaches the router, which picks the matching skill or area hub.</li>
<li><strong>Serve.</strong> Skills arrive as MCP tools, resources, and prompts as evidence, not opinions.</li>
<li><strong>Validate.</strong> Deterministic guardrails check generated code before it lands.</li>
</ol>
</section>

<section data-part="cards">
<h2>Start here</h2>
<article>
<h3><a href="docs/01-getting-started.md">Getting Started</a></h3>
<p>What it is, how to install it, and which agents, IDEs, and models it works with.</p>
</article>
<article>
<h3><a href="docs/README.md">Reference</a></h3>
<p>Architecture, surface map, prompts, guardrails, personas, CLI, and env vars.</p>
</article>
<article>
<h3><a href="docs/16-surface-map.md">Surface map</a></h3>
<p>Every command, tool, and skill in one generated table: Command · Tool · Skill.</p>
</article>
</section>

Node ≥ 20 · [MIT](LICENSE) · [Contributing](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Maintainers](MAINTAINERS.md) · [Security](SECURITY.md) · runtime deps: `@modelcontextprotocol/sdk` + `zod` only.
