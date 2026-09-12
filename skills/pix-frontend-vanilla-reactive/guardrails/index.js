/** The rules rule-frontend-vanilla-reactive owns, in canonical order. */
import { vanillaAdoptedStylesheets } from "./_adopted-stylesheets.js";
import { vanillaCeExtends } from "./_ce-extends.js";
import { vanillaFnComponent } from "./_fn-component.js";
import { vanillaFnNoRegister } from "./_fn-no-register.js";
import { vanillaHtmlTemplate } from "./_html-template.js";
import { vanillaMountGuard } from "./_mount-guard.js";
import { vanillaNoDollarBraces } from "./_no-dollar-braces.js";
import { vanillaTemplateDataPart } from "./_template-data-part.js";
import { vanillaTemplateLoad } from "./_template-load.js";

export const GUARDRAILS = [
  vanillaAdoptedStylesheets,
  vanillaCeExtends,
  vanillaFnComponent,
  vanillaFnNoRegister,
  vanillaHtmlTemplate,
  vanillaMountGuard,
  vanillaNoDollarBraces,
  vanillaTemplateDataPart,
  vanillaTemplateLoad,
];
