/**
 * Deep merge utility for safely merging nested objects
 * Used for merging customSettings JSON without losing existing data
 */

export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects, preserving existing keys
 * @param target - The target object (existing data)
 * @param source - The source object (new data to merge in)
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        // Recursively merge nested objects
        output[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        // Direct assignment for primitives, arrays, and null
        output[key] = sourceValue as T[Extract<keyof T, string>];
      }
    });
  }

  return output;
}

/**
 * Validate JSON string and return parsed object
 * @param jsonString - JSON string to validate
 * @returns Parsed object or null if invalid
 */
export function safeJsonParse<T = unknown>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

/**
 * Safely stringify object to JSON with formatting
 * @param obj - Object to stringify
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns JSON string or empty object string if error
 */
export function safeJsonStringify(
  obj: unknown,
  indent: number = 2
): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return "{}";
  }
}
