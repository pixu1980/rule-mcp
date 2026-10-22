

/** The language detector chooses the model; it never guesses a language it cannot see. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { detectLanguage } from "../_language.js";

test("Italian stopwords choose Italian", () => {
  assert.equal(detectLanguage("Mi serve un pulsante per la pagina"), "it");
  assert.equal(detectLanguage("Come si blocca una richiesta di unione quando una regola è violata?"), "it");
});

test("English stopwords choose English", () => {
  assert.equal(detectLanguage("I need a React button component"), "en");
  assert.equal(detectLanguage("How do I stop the model from generating slop?"), "en");
});

test("a token-only or empty prompt defaults to English", () => {
  assert.equal(detectLanguage("React"), "en");
  assert.equal(detectLanguage(""), "en");
});
