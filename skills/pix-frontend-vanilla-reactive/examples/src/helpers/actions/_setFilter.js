// ═══════════════════════════════════════════════════════════════════════════════
//  Action: setFilter
// ═══════════════════════════════════════════════════════════════════════════════

import { appStore } from '../shared/index.js';

export function setFilter(status) { appStore.state.filters.status = status; }
