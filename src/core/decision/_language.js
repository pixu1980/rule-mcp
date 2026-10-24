/**
 * @module core/decision/language
 *
 * A stopword count, not a language detector. The registry needs one bit:
 * whether the prompt is Italian or English. Technical nouns survive both
 * languages, so the function counts the words a speaker actually uses and
 * defaults to English when neither side has evidence.
 */

const ITALIAN = new Set(
  "il lo la i gli le un uno una di del della dei delle che chi cui è e sono per con come quando perché non si su in al alla ai alle da dal dalla questo questa questi queste mi ti ci vi ho hai ha abbiamo avete hanno fare devo deve posso può voglio vorrei serve bisogno mia mio tuo tua sua suo più meno molto poco anche ma o se allora dove quale quali cosa senza tra fra contro verso durante dopo prima oggi ora adesso".split(
    " ",
  ),
);

const ENGLISH = new Set(
  "the a an is are was were be been being to of and or but for with without how what when why where which who this that these those i you he she we they it my your his her our their do does did done can could should would will shall may might must need want make use using used create creating write writing read reading test tests testing build building fix fixing run running slow fast wrong right best better good bad first last next before after during over under between into from by as at on in out up down not no yes if then else than so because while about around through per via".split(
    " ",
  ),
);

const WORD = /[a-zàèéìòù]+/gu;

/**
 * The prompt's language, from the stopwords it uses.
 *
 * @param {string | undefined} text
 * @returns {"en" | "it"}
 */
export function detectLanguage(text) {
  const words =
    String(text ?? "")
      .toLowerCase()
      .match(WORD) ?? [];
  let italian = 0;
  let english = 0;

  for (const word of words) {
    if (ITALIAN.has(word)) {
      italian += 1;
    }

    if (ENGLISH.has(word)) {
      english += 1;
    }
  }

  return italian > english ? "it" : "en";
}
