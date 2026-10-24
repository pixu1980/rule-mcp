/**
 * @module tests/fixtures/routing-corpus-it
 *
 * The Italian slice, eight prompts across the same areas as the English corpus.
 *
 * The audit's four Italian prompts were not recorded, so this is a new slice
 * rather than a reconstruction: it keeps the technical nouns an Italian
 * developer would use (React, JWT, SQL, Express) and translates the rest, which
 * is the case the English-only model cannot read. The baseline test measures
 * this slice; it never borrows the audit's 3-of-4.
 *
 * @type {Array<{ prompt: string, expect: string, area: string }>}
 */
export const CORPUS_IT = [
  { prompt: "Mi serve un pulsante per la pagina", expect: "frontend-react", area: "frontend" },
  { prompt: "Come faccio a creare un componente React?", expect: "frontend-react", area: "frontend" },
  { prompt: "Verifica del token JWT: buone pratiche", expect: "backend-security", area: "backend" },
  { prompt: "Come mai la mia interrogazione è lenta?", expect: "data-sql", area: "data" },
  { prompt: "Come si scrive una prova che fallisce davvero?", expect: "devops-testing", area: "devops" },
  { prompt: "Quando un archivio vettoriale è la risposta sbagliata?", expect: "ai-context-engineering", area: "ai" },
  { prompt: "Come si blocca una richiesta di unione quando una regola è violata?", expect: "devops-testing", area: "devops" },
  { prompt: "Come si evita l'iniezione SQL in un endpoint Express?", expect: "backend-security", area: "backend" },
];
