import { z } from "zod";

const feedbackSchema = z.object({
  title: z.string().min(1).max(200),
  mediaType: z.enum(["movie", "tv"]),
  watched: z.boolean(),
  liked: z.boolean().nullable()
});

const aiTitleReferenceSchema = z.object({
  query: z.string().min(1).max(200),
  mediaType: z.enum(["all", "movie", "tv"]).default("all")
});

const aiAssistantConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(500)
});

const selectedMediaSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"])
});

export const recommendSchema = z.object({
  prompt: z.string().min(5).max(500),
  feedback: z.array(feedbackSchema).max(50).optional()
});

export const summarySchema = z.object({
  title: z.string().min(1),
  mediaType: z.enum(["movie", "tv"]),
  overview: z.string().min(10),
  genres: z.array(z.string()).default([]),
  releaseDate: z.string().nullable().optional()
});

export const aiSearchInterpretationSchema = z.object({
  normalizedQuery: z.string().min(1).max(200),
  alternatives: z.array(z.string().min(1).max(200)).max(3).default([])
});

export const aiRecommendationResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string(),
      mediaType: z.enum(["movie", "tv"]),
      shortReason: z.string(),
      mood: z.string().optional(),
      comparableTitle: z.string().optional()
    })
  )
});

export const aiCompareResponseSchema = z.object({
  shortVerdict: z.string().min(1),
  comparison: z
    .array(
      z.object({
        label: z.string().min(1),
        left: z.string().min(1),
        right: z.string().min(1)
      })
    )
    .min(3)
    .max(7),
  guidance: z.string().min(1)
});

export const aiFitResponseSchema = z.object({
  summary: z.string().min(1),
  reasons: z.array(z.string().min(1)).min(2).max(5),
  counterpoints: z.array(z.string().min(1)).min(1).max(3).optional(),
  caveat: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  dataNote: z.string().optional()
});

export const aiPriorityResponseSchema = z.object({
  summary: z.string().min(1),
  order: z
    .array(
      z.object({
        title: z.string().min(1),
        mediaType: z.enum(["movie", "tv"]),
        reason: z.string().min(1)
      })
    )
    .min(2)
    .max(50)
});

export const aiAssistantResponseSchema = z.object({
  lead: z.string().min(1),
  personalNote: z.string().optional(),
  picks: z
    .array(
      z.object({
        title: z.string().min(1),
        mediaType: z.enum(["movie", "tv"]),
        reason: z.string().min(1),
        comparableTitle: z.string().optional()
      })
    )
    .min(1)
    .max(8),
  nextStep: z.string().optional()
});

export const aiTitleInsightsResponseSchema = z.object({
  vibeTags: z.array(z.string().min(1)).min(3).max(6),
  contentWarning: z.string().min(1)
});

export const aiPersonInsightsResponseSchema = z.object({
  summary: z.string().min(1),
  highlights: z.array(z.string().min(1)).min(2).max(5)
});

export const aiActionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("compare"),
    left: aiTitleReferenceSchema,
    right: aiTitleReferenceSchema
  }),
  z.object({
    mode: z.literal("fit"),
    title: aiTitleReferenceSchema,
    feedback: z.array(feedbackSchema).max(50).default([]),
    userPrompt: z.string().trim().max(300).optional()
  }),
  z.object({
    mode: z.literal("priority"),
    items: z.array(selectedMediaSchema).min(2).max(50),
    feedback: z.array(feedbackSchema).max(50).default([]),
    context: z.string().trim().max(200).optional()
  }),
  z.object({
    mode: z.literal("assistant"),
    prompt: z.string().trim().min(5).max(400),
    mediaType: z.enum(["all", "movie", "tv"]).default("all"),
    timeBudget: z.string().trim().max(120).optional(),
    mood: z.string().trim().max(120).optional(),
    intensity: z.enum(["easy", "balanced", "intense"]).optional(),
    socialContext: z.enum(["solo", "parents", "friends", "date", "family"]).optional(),
    referenceTitles: z.array(aiTitleReferenceSchema).max(3).default([]),
    feedback: z.array(feedbackSchema).max(50).default([]),
    conversation: z.array(aiAssistantConversationMessageSchema).max(12).default([])
  }),
  z.object({
    mode: z.literal("title_insights"),
    title: aiTitleReferenceSchema
  }),
  z.object({
    mode: z.literal("person_insights"),
    personId: z.number().int().positive()
  })
]);
