/** Vanilla-reactive component guardrail family, one rule per file. */
import { vanillaCeExtends } from "./_ce-extends.js";
import { vanillaHtmlTemplate } from "./_html-template.js";
import { vanillaMountGuard } from "./_mount-guard.js";
import { vanillaAdoptedStylesheets } from "./_adopted-stylesheets.js";
import { vanillaFnComponent } from "./_fn-component.js";
import { vanillaFnNoRegister } from "./_fn-no-register.js";
import { vanillaNoDollarBraces } from "./_no-dollar-braces.js";
import { vanillaTemplateDataPart } from "./_template-data-part.js";
import { vanillaTemplateLoad } from "./_template-load.js";

export const VANILLA_REACTIVE_GUARDRAILS = [
  vanillaCeExtends,
  vanillaHtmlTemplate,
  vanillaMountGuard,
  vanillaAdoptedStylesheets,
  vanillaFnComponent,
  vanillaFnNoRegister,
  vanillaNoDollarBraces,
  vanillaTemplateDataPart,
  vanillaTemplateLoad,
];
