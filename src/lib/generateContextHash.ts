import { createHash } from "crypto";

export function generateContextHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
