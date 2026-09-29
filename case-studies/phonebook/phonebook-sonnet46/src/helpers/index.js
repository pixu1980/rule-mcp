/**
 * @file src/helpers/index.js
 * @description Barrel — re-exports all helper utilities and context.
 */
export { adoptSheet } from "./_adoptSheet.js";
export { getAvatarColorIndex, getAvatarColor, getInitials, formatBirthday, formatLabel, filterContacts, groupByLetter, newId } from "./_contacts.js";
export { SAMPLE_CONTACTS } from "./_sampleData.js";
export { AppProvider, useAppState, useAppDispatch } from "./_AppContext.jsx";
