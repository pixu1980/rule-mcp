# GitHub admin checklist

Passi da eseguire come admin della repo. Quando tutte le caselle sono
spuntate, il prossimo `handoff` archivia questo piano in un ADR e lo
rimuove da qui (vale per ogni piano completato).

## Sicurezza e segnalazioni (Step 2)

- [ ] **2.1**: abilita Private Vulnerability Reporting in
      `Settings > Code security > security_analysis`
      (https://github.com/pixu1980/rule-mcp/settings/security_analysis).
- [ ] **2.5**: conferma che il tab Security mostra "Report a vulnerability".

## Pagine docs (Step 27)

- [ ] Abilita Pages in `Settings > Pages` con Source "GitHub Actions"
      (https://github.com/pixu1980/rule-mcp/settings/pages).
      Il workflow `Pages` (`pages.yml`, gia pronto e verificato) gira su push
      di `main` o manuale via `workflow_dispatch`.
- [ ] Riporta l'URL pubblicato in chat: serve per 27.4 (diventa l'URL
      canonico negli installer al posto dell'interim taggato).

## Protezione branch (Step 10, 16)

- [ ] Proteggi `main` in `Settings > Branches`
      (https://github.com/pixu1980/rule-mcp/settings/branches):
      require i check ci, CodeQL e audit gate, una review per i contributori
      esterni.
- [ ] Riporta l'impostazione esatta in chat: va registrata in
      `GOVERNANCE.md` cosi resta verificabile (16.5).

## Comunita (Step 14, 23)

- [ ] Crea le label `bug`, `enhancement`, `good first issue`,
      `needs-triage`, `help wanted` in
      https://github.com/pixu1980/rule-mcp/labels.
- [ ] Marca due task piccoli come `good first issue` (23.3).
- [ ] Controlla il community profile: deve risultare CODE_OF_CONDUCT (14.5).

## Sponsorizzazioni (Step 25)

- [ ] Crea il profilo GitHub Sponsors
      (https://github.com/sponsors) e riportaci lo stesso testo della
      policy in README e GOVERNANCE (25.4).

## Firme (Step 29)

- [ ] Abilita Vigilant Mode nelle impostazioni personali
      (`Settings > SSH and GPG keys`, https://github.com/settings/keys) (29.2).

## Pulizia release vecchia

- [ ] Cancella da remoto il tag `v1.0.0` e la Release page `v1.0.0`
      (cancellazione locale rifiutata dalle regole).
- [ ] Pubblica `v0.1.0` sul registry come da decisione registrata
      (nessun placeholder).

## Dopo il merge su main: gate da osservare in CI

- [ ] **6.6**: un tag di prova produce la release con tarball piu checksum,
      ogni job tranne release dichiara `contents: read`.
- [ ] **7.6**: job zizmor verde su main.
- [ ] **8.5**: matrice CI verde dopo il taglio dei permessi.
- [ ] **9.5**: prima PR Dependabot entro una settimana.
- [ ] **10.5**: CodeQL verde con zero alert e check required.
- [ ] **16.6**: CODEOWNERS risolve su una PR di prova.
- [ ] **22.4/22.5**: run Scorecard, sbom presente alla release, score
      registrato per il prossimo giro.
- [ ] **27.6**: Pages verde, sito con tutti i 15 capitoli, link-integrity verde.
- [ ] **29.4**: il tag verifica con `git tag --verify`, badge Verified su GitHub.
