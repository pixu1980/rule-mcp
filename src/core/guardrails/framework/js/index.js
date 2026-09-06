/** Framework-shared JS guardrail family, one rule per file. */
import { jsIfBraces } from "./_if-braces.js";
import { jsNoInlineBlocks } from "./_no-inline-blocks.js";
import { jsNoBlankLinesInBlocks } from "./_no-blank-lines-in-blocks.js";
import { jsSingleLineMethod } from "./_single-line-method.js";
import { jsForLoopBraces } from "./_for-loop-braces.js";
import { jsBlankLineBeforeReturn } from "./_blank-line-before-return.js";
import { jsBlankLineBetweenMethods } from "./_blank-line-between-methods.js";
import { jsBlankLinesBlocks } from "./_blank-lines-blocks.js";
import { jsConstTop } from "./_const-top.js";
import { jsThrowNewError } from "./_throw-new-error.js";
import { jsNewForBuiltins } from "./_new-for-builtins.js";
import { jsArrayFlatMap } from "./_array-flat-map.js";
import { jsPreferSetHas } from "./_prefer-set-has.js";
import { jsNodeProtocol } from "./_node-protocol.js";
import { jsPreferReplaceAll } from "./_prefer-replace-all.js";
import { jsNoArrayForEach } from "./_no-array-for-each.js";

export const JS_GUARDRAILS = [
  jsIfBraces,
  jsNoInlineBlocks,
  jsNoBlankLinesInBlocks,
  jsSingleLineMethod,
  jsForLoopBraces,
  jsBlankLineBeforeReturn,
  jsBlankLineBetweenMethods,
  jsBlankLinesBlocks,
  jsConstTop,
  jsThrowNewError,
  jsNewForBuiltins,
  jsArrayFlatMap,
  jsPreferSetHas,
  jsNodeProtocol,
  jsPreferReplaceAll,
  jsNoArrayForEach,
];
