// ═══════════════════════════════════════════════════════════════════════════════
//  Computed: renderContext
// ═══════════════════════════════════════════════════════════════════════════════

import { ComputedSignal } from '../../core/index.js';
import { appStore, tickState } from '../shared/index.js';
import { visibleTodos } from './_visibleTodos.js';
import { stats } from './_stats.js';

export const renderContext = new ComputedSignal(() => {
  tickState.get();
  return {
    appTitle: appStore.state.ui.appTitle,
    description: appStore.state.ui.description,
    extraInfo: appStore.state.ui.extraInfo,
    visibleTodos: visibleTodos.get(),
    total: stats.get().total,
    open: stats.get().open,
    completed: stats.get().completed,
    pulseCount: Math.round(tickState.peek()),
    filterStatus: appStore.state.filters.status,
    tags: ['html', 'css', 'js', 'demo'],
  };
});
