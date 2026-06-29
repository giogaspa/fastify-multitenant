import { TenantId } from "./types.js"

/**
 * Normalizes a raw value returned by an identifier strategy into a tenant id.
 * Returns `undefined` for non-string or whitespace-only values, otherwise the trimmed string.
 *
 * @param value The raw value produced by a strategy (header/query value, custom strategy result, ...).
 */
export function normalizeTenantId(value: unknown): TenantId | undefined {
    if (typeof value !== 'string') {
        return undefined
    }

    const trimmed = value.trim()

    return trimmed.length === 0 ? undefined : trimmed
}
