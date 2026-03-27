import type { NextApiRequest, NextApiResponse } from "next";

import { generateSpoilerFreeSummary } from "@/lib/ai/detail-content";
import { summarySchema } from "@/lib/ai/schemas";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const parsed = summarySchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const summary = await generateSpoilerFreeSummary(parsed.data);
    return response.status(200).json({ summary });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Summary failed"
    });
  }
}
