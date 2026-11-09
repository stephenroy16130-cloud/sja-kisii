import { randomInt } from "crypto";

const UP = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOW = "abcdefghijkmnpqrstuvwxyz";
const NUM = "23456789";
const pick = (s: string, n: number) => Array.from({ length: n }, () => s[randomInt(s.length)]);

// 10 characters, easy to read out, and always meets the password rules
export function tempPassword(): string {
  const chars = [...pick(UP, 3), ...pick(LOW, 4), ...pick(NUM, 3)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
