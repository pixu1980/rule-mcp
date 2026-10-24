// Template Engine - Array and collection filters

/**
 * @param {import("../renderer/index.js").TemplateRenderer} renderer
 */
export function registerCollectionFilters(renderer) {
  renderer.registerFilter("join", (value, separator = ", ") => {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          // Handle tag objects {key, label}
          if (typeof item === "object" && item.label) {
            return item.label;
          }
          return String(item);
        })
        .join(separator);
    }
    return value;
  });

  renderer.registerFilter("length", (value) => {
    if (Array.isArray(value) || typeof value === "string") {
      return value.length;
    }
    return 0;
  });

  renderer.registerFilter("first", (value) => {
    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }
    return value;
  });

  renderer.registerFilter("last", (value) => {
    if (Array.isArray(value) && value.length > 0) {
      return value[value.length - 1];
    }
    return value;
  });

  renderer.registerFilter("prop", (value, propertyName) => {
    if (typeof value === "object" && value !== null) {
      return value[propertyName];
    }
    return value;
  });

  renderer.registerFilter("slice", (value, start = 0, end = undefined) => {
    if (Array.isArray(value)) {
      return value.slice(start, end);
    }
    if (typeof value === "string") {
      return value.slice(start, end);
    }
    return value;
  });

  renderer.registerFilter("groupBy", (array, property) => {
    if (!Array.isArray(array)) return array;

    const groups = {};
    array.forEach((item) => {
      const key = item[property];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return groups;
  });

  renderer.registerFilter("sortBy", (array, property, direction = "asc") => {
    if (!Array.isArray(array)) return array;

    return [...array].sort((a, b) => {
      let valueA = a[property];
      let valueB = b[property];

      // Handle dates
      if (property === "date") {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }

      if (direction === "desc") {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    });
  });
}
