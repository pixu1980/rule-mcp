// Template Engine - Date and relative-time filters

/**
 * @param {import("../renderer/index.js").TemplateRenderer} renderer
 */
export function registerDateFilters(renderer) {
  renderer.registerFilter("date", (value, format = "it-IT") => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    // Handle strftime-like format strings
    if (format.includes("%")) {
      const options = {};
      if (format.includes("%d")) options.day = "numeric";
      if (format.includes("%B")) options.month = "long";
      if (format.includes("%Y")) options.year = "numeric";
      return date.toLocaleDateString("it-IT", options);
    }

    // Handle predefined formats
    switch (format) {
      case "full":
        return date.toLocaleDateString("it-IT", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      case "long":
        return date.toLocaleDateString("it-IT", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      case "medium":
        return date.toLocaleDateString("it-IT", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

      case "short":
        return date.toLocaleDateString("it-IT", {
          year: "2-digit",
          month: "numeric",
          day: "numeric",
        });

      case "iso":
        return date.toISOString();

      case "YYYY-MM-DD":
        return date.toISOString().split("T")[0];

      case "DD MMM YYYY": {
        const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
        const day = date.getDate().toString().padStart(2, "0");
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      }

      case "time":
        return date.toLocaleTimeString("it-IT");

      case "datetime":
        return date.toLocaleString("it-IT");
      default: {
        // If it's not a predefined format, treat as locale
        const options = {
          year: "numeric",
          month: "long",
          day: "numeric",
        };

        // Try to use as locale, fallback to 'it-IT' if invalid
        try {
          return date.toLocaleDateString(format, options);
        } catch (_e) {
          console.warn(`Invalid locale "${format}", falling back to 'it-IT'`);
          return date.toLocaleDateString("it-IT", options);
        }
      }
    }
  });

  renderer.registerFilter("timeAgo", (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "proprio ora";
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minuto" : "minuti"} fa`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "ora" : "ore"} fa`;
    if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? "giorno" : "giorni"} fa`;

    return date.toLocaleDateString("it-IT");
  });
}
