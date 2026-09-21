/**
 * File-size ratchet: every file that exceeded the 150-line cap when the
 * budget test landed, with the line count it had then. A file may only
 * shrink: going over its recorded size fails the build, and dropping to
 * 150 or less means its entry must be deleted. An entry is added only as the
 * adoption baseline for a root the cap has just reached, recorded in the ADR
 * that added it - ADR 112 did this for skills/ - so that new entries are
 * otherwise forbidden. Data file: exempt from the size cap itself.
 *
 * ARCH-7.1 cleared the six skills/ adoption entries; the map stays empty until
 * another root joins the cap.
 */

export const FILE_SIZE_RATCHET = new Map();
