// Simple nanoid-like unique ID generator
// Standard UUID generator for DB compatibility
export function nanoid() {
    return crypto.randomUUID();
}
