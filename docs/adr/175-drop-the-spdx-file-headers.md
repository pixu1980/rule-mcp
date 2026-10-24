# 175: Drop the SPDX file headers

- **Date**: 2026-10-24
- **Status**: accepted
- **Tags**: legal, governance, process
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Every tracked source file opened with two machine-readable lines:

```text


```

ADR 071 introduced them with REUSE.toml to make per-file licensing explicit. The
result was 1456 files whose first two lines are identical boilerplate, a CI job
that exists only to check them, and a header that says nothing a reader of the
repository does not already know. The owner asked for the headers and the check
to go.

## Decision

Remove the two header lines from every tracked file, delete the header checker
and the `License headers` CI job, and stop treating the header as a source-file
requirement. `LICENSE`, `REUSE.toml` and the package metadata remain the
license grant; no file changes its license.

## Consequences

Files start with their first meaningful line and the size budget counts what a
module actually wrote. The license is stated once, in the files a license
reader already looks for, instead of repeated in every implementation file. A
tool that scans per-file SPDX tags will find none; REUSE.toml still maps the
repository to MIT.

## What would end this

A distribution model that requires a per-file SPDX tag, or a downstream consumer
that rejects files without one, would bring the headers back as a packaging
step rather than a hand-written line in every file.

## Alternatives Considered

1. Keep the headers and drop only the CI job (the boilerplate would drift, and
   nobody would notice)
1. Keep a single header on the entry points only (a per-file claim that is true
   for some files is worse than no per-file claim)
1. Replace the headers with a generated file at release time (a build step for
   text nobody reads)
