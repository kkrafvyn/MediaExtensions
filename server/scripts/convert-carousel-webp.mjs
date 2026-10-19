import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../client/public/images/carousel",
);

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg"));
for (const file of files) {
  const input = path.join(dir, file);
  const output = path.join(dir, file.replace(/\.jpg$/i, ".webp"));
  await sharp(input).webp({ quality: 82 }).toFile(output);
  console.log("Wrote", path.basename(output));
}
