// Simple nanoid-like unique ID generator
export function nanoid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}
