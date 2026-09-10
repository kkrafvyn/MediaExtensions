import { Router } from "express";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { downloadTokens } from "../db/schema.js";
import { getObject } from "../lib/storage.js";

const router = Router();

router.get("/:token", async (req, res) => {
  const tokenRow = await db.query.downloadTokens.findFirst({
    where: eq(downloadTokens.token, req.params.token),
    with: {
      orderItem: {
        with: { order: true },
      },
    },
  });

  if (!tokenRow || !tokenRow.orderItem) {
    return res.status(404).json({ error: "Download not found" });
  }

  const order = tokenRow.orderItem.order;
  if (!order || (order.status !== "paid" && order.status !== "fulfilled")) {
    return res.status(403).json({ error: "Order is not paid" });
  }

  if (tokenRow.expiresAt.getTime() < Date.now()) {
    return res.status(410).json({ error: "Download link expired" });
  }

  if (tokenRow.downloadCount >= tokenRow.maxDownloads) {
    return res.status(429).json({ error: "Download limit reached" });
  }

  const asset = tokenRow.orderItem.digitalAssetPath;
  if (!asset) {
    return res.status(404).json({ error: "File missing" });
  }

  const stored = await getObject("downloads", path.basename(asset));
  if (!stored) {
    return res.status(404).json({ error: "File missing on server" });
  }

  await db
    .update(downloadTokens)
    .set({ downloadCount: tokenRow.downloadCount + 1 })
    .where(eq(downloadTokens.id, tokenRow.id));

  res.setHeader("Content-Disposition", `attachment; filename="${stored.filename}"`);
  if (stored.contentType) res.setHeader("Content-Type", stored.contentType);
  if (stored.contentLength != null) res.setHeader("Content-Length", String(stored.contentLength));
  stored.stream.pipe(res);
});

export default router;
