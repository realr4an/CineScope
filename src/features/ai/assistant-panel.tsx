"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  FolderOpen,
  MessageSquarePlus,
  RefreshCw,
  Save,
  SendHorizontal,
  SlidersHorizontal,
  Trash2,
  User2
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AIPanelShell, AIPicksGrid } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { useLanguage } from "@/features/i18n/language-provider";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";

type AssistantResponse = {
  mode: "assistant";
  data: {
    lead: string;
    personalNote?: string;
    picks: Array<{
      title: string;
      mediaType: "movie" | "tv";
      reason: string;
      comparableTitle?: string;
      tmdbId?: number;
      href?: string;
    }>;
    nextStep?: string;
  };
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  personalNote?: string;
  nextStep?: string;
  picks?: AssistantResponse["data"]["picks"];
  pending?: boolean;
  staticIntro?: boolean;
};

type ContextDraft = {
  prompt: string;
  mediaType: "all" | "movie" | "tv";
  timeBudget: string;
  mood: string;
  intensity: "easy" | "balanced" | "intense";
  socialContext: "solo" | "parents" | "friends" | "date" | "family" | "";
  referenceTitles: string;
};

type SavedChat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  draft: ContextDraft;
};

type DraftSnapshot = {
  messages: ChatMessage[];
  draft: ContextDraft;
};

const DRAFT_STORAGE_KEY_BASE = "cine-ai-assistant-draft-v1";
const SAVED_STORAGE_KEY_BASE = "cine-ai-assistant-saved-v1";
const MAX_SAVED_CHATS = 12;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function truncateWithEllipsis(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function sanitizeMessages(messages: ChatMessage[]) {
  return messages
    .filter(message => !message.pending && !message.staticIntro)
    .map(({ pending, staticIntro, ...message }) => message);
}

function normalizeMessagesWithIntro(messages: ChatMessage[], introMessage: ChatMessage) {
  const sanitized = sanitizeMessages(messages);

  if (!sanitized.length) {
    return [introMessage];
  }

  return [introMessage, ...sanitized];
}

function readStorageValue<T>(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return null;
    }
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function writeStorageValue<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage write failures
  }
}

export function AIAssistantPanel() {
  const { items } = useWatchlist();
  const { locale } = useLanguage();
  const text =
    locale === "en"
      ? {
          quickPrompts: [
            "I only have about 2 hours tonight and want something strong but not too heavy.",
            "I need something for date night, atmospheric and accessible.",
            "I want a miniseries for the weekend.",
            "Recommend something like the titles I liked, but a bit lighter."
          ],
          loadError: "The AI assistant could not be loaded.",
          title: "Assistant chat",
          description:
            "A conversational AI layer for mood, time, social context, and your personal taste.",
          inputPlaceholder: "Write what you want to watch.",
          send: "Send",
          context: "Context",
          typeAll: "Movie or series",
          typeMovie: "Movies only",
          typeTv: "Series only",
          timePlaceholder: "Time budget, e.g. 90 minutes",
          moodPlaceholder: "Mood, e.g. dark but accessible",
          easy: "Lighter",
          balanced: "Balanced",
          intense: "More intense",
          social: "Social context",
          solo: "Solo",
          parents: "With parents",
          friends: "With friends",
          date: "Date night",
          family: "Family",
          referencePlaceholder: "Reference titles, comma-separated",
          intro:
            "Hi, I can help you decide what to watch. Tell me what mood, time budget, or occasion you have in mind, and I will guide you from there.",
          chipsLabel: "You can start with one of these prompts:",
          typing: "Typing...",
          clearContext: "Clear context",
          clearChat: "New chat",
          saveChat: "Save chat",
          savedChats: "Saved chats",
          loadChat: "Load",
          deleteChat: "Delete",
          saveSuccess: "Chat saved.",
          loadSuccess: "Saved chat loaded.",
          deleteSuccess: "Saved chat deleted.",
          noChatToSave: "There is no conversation to save yet.",
          you: "You",
          ai: "AI",
          nextLabel: "Next",
          updatedAt: "Upd."
        }
      : {
          quickPrompts: [
            "Ich habe heute Abend nur etwa 2 Stunden und will etwas starkes, aber nicht zu schweres.",
            "Ich suche etwas für Date Night, eher stimmungsvoll und zugänglich.",
            "Ich will eine Miniserie fürs Wochenende.",
            "Schlage mir etwas vor wie die Titel, die mir gefallen haben, aber etwas leichter."
          ],
          loadError: "Die KI-Auswahlhilfe konnte nicht geladen werden.",
          title: "Assistenz-Chat",
          description:
            "Ein gesprächiger KI-Layer für Stimmung, Zeit, soziale Situation und deinen Geschmack.",
          inputPlaceholder: "Schreibe, worauf du Lust hast.",
          send: "Senden",
          context: "Kontext",
          typeAll: "Film oder Serie",
          typeMovie: "Nur Filme",
          typeTv: "Nur Serien",
          timePlaceholder: "Zeitbudget, z. B. 90 Minuten",
          moodPlaceholder: "Stimmung, z. B. düster aber zugänglich",
          easy: "Eher leicht",
          balanced: "Ausgewogen",
          intense: "Eher intensiv",
          social: "Sozialer Kontext",
          solo: "Alleine",
          parents: "Mit Eltern",
          friends: "Mit Freunden",
          date: "Date Night",
          family: "Familie",
          referencePlaceholder: "Referenztitel, komma-getrennt",
          intro:
            "Hi, ich helfe dir beim Aussuchen. Sag mir einfach Stimmung, Zeitbudget oder Anlass, und ich führe dich Schritt für Schritt zu passenden Titeln.",
          chipsLabel: "Zum Einstieg kannst du auch direkt damit starten:",
          typing: "Schreibt gerade...",
          clearContext: "Kontext leeren",
          clearChat: "Neuer Chat",
          saveChat: "Chat speichern",
          savedChats: "Gespeicherte Chats",
          loadChat: "Laden",
          deleteChat: "Löschen",
          saveSuccess: "Chat gespeichert.",
          loadSuccess: "Gespeicherter Chat geladen.",
          deleteSuccess: "Gespeicherter Chat gelöscht.",
          noChatToSave: "Es gibt noch keinen Chatverlauf zum Speichern.",
          you: "Du",
          ai: "KI",
          nextLabel: "Nächster Schritt",
          updatedAt: "Akt."
        };

  const introMessage = useMemo<ChatMessage>(
    () => ({
      id: "assistant-intro",
      role: "assistant",
      content: text.intro,
      staticIntro: true
    }),
    [text.intro]
  );

  const defaultDraft = useMemo<ContextDraft>(
    () => ({
      prompt: "",
      mediaType: "all",
      timeBudget: "",
      mood: "",
      intensity: "balanced",
      socialContext: "",
      referenceTitles: ""
    }),
    []
  );

  const hydratedRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [prompt, setPrompt] = useState(defaultDraft.prompt);
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">(defaultDraft.mediaType);
  const [timeBudget, setTimeBudget] = useState(defaultDraft.timeBudget);
  const [mood, setMood] = useState(defaultDraft.mood);
  const [intensity, setIntensity] = useState<"easy" | "balanced" | "intense">(defaultDraft.intensity);
  const [socialContext, setSocialContext] = useState<
    "solo" | "parents" | "friends" | "date" | "family" | ""
  >(defaultDraft.socialContext);
  const [referenceTitles, setReferenceTitles] = useState(defaultDraft.referenceTitles);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [selectedSavedChatId, setSelectedSavedChatId] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const applyDraft = (draft: ContextDraft) => {
    setPrompt(draft.prompt);
    setMediaType(draft.mediaType);
    setTimeBudget(draft.timeBudget);
    setMood(draft.mood);
    setIntensity(draft.intensity);
    setSocialContext(draft.socialContext);
    setReferenceTitles(draft.referenceTitles);
  };

  const getCurrentDraft = (): ContextDraft => ({
    prompt,
    mediaType,
    timeBudget,
    mood,
    intensity,
    socialContext,
    referenceTitles
  });

  const resetContext = () => {
    applyDraft({
      prompt,
      mediaType: "all",
      timeBudget: "",
      mood: "",
      intensity: "balanced",
      socialContext: "",
      referenceTitles: ""
    });
  };

  const resetConversation = () => {
    setMessages([introMessage]);
    setError(null);
    setLoading(false);
    setPrompt("");
  };

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }

    setStorageReady(false);

    const draftSnapshot = readStorageValue<DraftSnapshot>(DRAFT_STORAGE_KEY_BASE);
    const storedChats = readStorageValue<SavedChat[]>(SAVED_STORAGE_KEY_BASE) ?? [];
    const normalizedStoredChats = storedChats.map(chat => ({
      ...chat,
      title: truncateWithEllipsis(chat.title, 36)
    }));

    setSavedChats(normalizedStoredChats);
    setSelectedSavedChatId(normalizedStoredChats[0]?.id ?? "");

    if (draftSnapshot) {
      setMessages(normalizeMessagesWithIntro(draftSnapshot.messages, introMessage));
      applyDraft(draftSnapshot.draft);
    } else {
      setMessages([introMessage]);
      applyDraft(defaultDraft);
    }

    setError(null);
    setLoading(false);
    hydratedRef.current = true;
    setStorageReady(true);
  }, [defaultDraft, introMessage]);

  useEffect(() => {
    setMessages(current =>
      current.length === 1 && current[0]?.staticIntro
        ? [introMessage]
        : [introMessage, ...sanitizeMessages(current)]
    );
  }, [introMessage]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    const draftSnapshot: DraftSnapshot = {
      messages: sanitizeMessages(messages),
      draft: getCurrentDraft()
    };

    writeStorageValue(DRAFT_STORAGE_KEY_BASE, draftSnapshot);
  }, [
    messages,
    prompt,
    mediaType,
    timeBudget,
    mood,
    intensity,
    socialContext,
    referenceTitles,
    storageReady
  ]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    writeStorageValue(SAVED_STORAGE_KEY_BASE, savedChats);
  }, [savedChats, storageReady]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const feedback = useMemo(
    () =>
      items
        .filter(item => item.watched || item.liked !== null)
        .map(item => ({
          title: item.title,
          mediaType: item.mediaType,
          watched: item.watched,
          liked: item.liked
        })),
    [items]
  );

  const saveCurrentChat = () => {
    const snapshotMessages = sanitizeMessages(messages);

    if (!snapshotMessages.length) {
      toast.error(text.noChatToSave);
      return;
    }

    const now = Date.now();
    const lastUserMessage = [...snapshotMessages].reverse().find(message => message.role === "user");
    const fallbackMessage = snapshotMessages[snapshotMessages.length - 1];
    const titleSource = lastUserMessage?.content || fallbackMessage?.content || text.title;
    const nextChat: SavedChat = {
      id: createId("saved-chat"),
      title: truncateWithEllipsis(titleSource, 36),
      createdAt: now,
      updatedAt: now,
      messages: snapshotMessages,
      draft: getCurrentDraft()
    };

    setSavedChats(current => [nextChat, ...current].slice(0, MAX_SAVED_CHATS));
    setSelectedSavedChatId(nextChat.id);
    toast.success(text.saveSuccess);
  };

  const loadSavedChat = () => {
    if (!selectedSavedChatId) {
      return;
    }

    const selected = savedChats.find(chat => chat.id === selectedSavedChatId);

    if (!selected) {
      return;
    }

    setMessages(normalizeMessagesWithIntro(selected.messages, introMessage));
    applyDraft(selected.draft);
    setError(null);
    setLoading(false);
    toast.success(text.loadSuccess);
  };

  const deleteSavedChat = () => {
    if (!selectedSavedChatId) {
      return;
    }

    setSavedChats(current => {
      const nextChats = current.filter(chat => chat.id !== selectedSavedChatId);
      setSelectedSavedChatId(nextChats[0]?.id ?? "");
      return nextChats;
    });
    toast.success(text.deleteSuccess);
  };

  const submit = async (nextPrompt?: string) => {
    const content = (nextPrompt ?? prompt).trim();

    if (!content || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content
    };
    const pendingMessage: ChatMessage = {
      id: createId("assistant"),
      role: "assistant",
      content: text.typing,
      pending: true
    };
    const conversation = [...messages, userMessage]
      .filter(message => !message.staticIntro && !message.pending)
      .slice(-12)
      .map(message => ({
        role: message.role,
        content: message.content
      }));

    setMessages(current => [...current, userMessage, pendingMessage]);
    setPrompt("");
    setLoading(true);
    setError(null);

    try {
      const response = await postAIAction<AssistantResponse>(
        {
          mode: "assistant",
          prompt: content,
          mediaType,
          timeBudget: timeBudget || undefined,
          mood: mood || undefined,
          intensity,
          socialContext: socialContext || undefined,
          referenceTitles: referenceTitles
            .split(",")
            .map(value => value.trim())
            .filter(Boolean)
            .slice(0, 3)
            .map(title => ({ query: title, mediaType: "all" })),
          feedback,
          conversation
        },
        text.loadError
      );

      setMessages(current =>
        current.map(message =>
          message.id === pendingMessage.id
            ? {
                id: createId("assistant-response"),
                role: "assistant",
                content: response.data.lead,
                personalNote: response.data.personalNote,
                nextStep: response.data.nextStep,
                picks: response.data.picks
              }
            : message
        )
      );
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : text.loadError;
      setError(message);
      toast.error(message);
      setMessages(current =>
        current.map(chatMessage =>
          chatMessage.id === pendingMessage.id
            ? {
                id: createId("assistant-error"),
                role: "assistant",
                content: message
              }
            : chatMessage
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={saveCurrentChat}>
        <Save className="size-4" />
        <span>{text.saveChat}</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={resetConversation}>
        <MessageSquarePlus className="size-4" />
        <span>{text.clearChat}</span>
      </Button>
    </div>
  );

  return (
    <AIPanelShell
      title={text.title}
      description={text.description}
      actions={actions}
      className="overflow-hidden"
    >
      <div className="min-w-0 space-y-5">
        <div className="min-w-0 rounded-[1.75rem] border border-border/50 bg-background/45">
          <div className="max-h-[34rem] space-y-4 overflow-x-hidden overflow-y-auto p-4 sm:p-5">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`min-w-0 max-w-[92%] space-y-3 sm:max-w-[80%] ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`inline-flex items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] ${
                      message.role === "user" ? "justify-end text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {message.role === "user" ? <User2 className="size-3.5" /> : <Bot className="size-3.5" />}
                    <span>{message.role === "user" ? text.you : text.ai}</span>
                  </div>
                  <div
                    className={`max-w-full rounded-[1.5rem] px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.pending
                          ? "border border-border/50 bg-card/70 text-muted-foreground"
                          : "border border-border/50 bg-card/70 text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-line break-words">{message.content}</p>
                  </div>
                  {message.picks && message.picks.length ? (
                    <div className="w-full">
                      <AIPicksGrid picks={message.picks} />
                    </div>
                  ) : null}
                  {message.nextStep ? (
                    <div className="rounded-[1.35rem] border border-dashed border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                        {text.nextLabel}
                      </div>
                      <p className="whitespace-pre-line break-words leading-6">{message.nextStep}</p>
                    </div>
                  ) : null}
                  {message.staticIntro ? (
                    <div className="space-y-2">
                      <p className="px-1 text-xs text-muted-foreground">{text.chipsLabel}</p>
                      <div className="flex flex-wrap gap-2">
                        {text.quickPrompts.map(quickPrompt => (
                          <button
                            key={quickPrompt}
                            type="button"
                            onClick={() => {
                              setPrompt(quickPrompt);
                              void submit(quickPrompt);
                            }}
                            className="rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                          >
                            {quickPrompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border/50 bg-card/20 p-4 sm:p-5">
            <div className="space-y-4">
              <details className="group rounded-2xl border border-border/50 bg-background/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-primary" />
                    {text.context}
                  </span>
                  <span className="text-xs text-muted-foreground group-open:hidden">
                    {text.send}
                  </span>
                </summary>
                <div className="grid gap-3 border-t border-border/50 px-4 py-4 md:grid-cols-2 lg:grid-cols-3">
                  <select
                    value={mediaType}
                    onChange={event => setMediaType(event.target.value as "all" | "movie" | "tv")}
                    className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                  >
                    <option value="all">{text.typeAll}</option>
                    <option value="movie">{text.typeMovie}</option>
                    <option value="tv">{text.typeTv}</option>
                  </select>
                  <input
                    value={timeBudget}
                    onChange={event => setTimeBudget(event.target.value)}
                    placeholder={text.timePlaceholder}
                    className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                  />
                  <input
                    value={mood}
                    onChange={event => setMood(event.target.value)}
                    placeholder={text.moodPlaceholder}
                    className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                  />
                  <select
                    value={intensity}
                    onChange={event =>
                      setIntensity(event.target.value as "easy" | "balanced" | "intense")
                    }
                    className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                  >
                    <option value="easy">{text.easy}</option>
                    <option value="balanced">{text.balanced}</option>
                    <option value="intense">{text.intense}</option>
                  </select>
                  <select
                    value={socialContext}
                    onChange={event =>
                      setSocialContext(
                        event.target.value as "solo" | "parents" | "friends" | "date" | "family" | ""
                      )
                    }
                    className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                  >
                    <option value="">{text.social}</option>
                    <option value="solo">{text.solo}</option>
                    <option value="parents">{text.parents}</option>
                    <option value="friends">{text.friends}</option>
                    <option value="date">{text.date}</option>
                    <option value="family">{text.family}</option>
                  </select>
                  <input
                    value={referenceTitles}
                    onChange={event => setReferenceTitles(event.target.value)}
                    placeholder={text.referencePlaceholder}
                    className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                  />
                  <Button type="button" variant="outline" onClick={resetContext} className="md:col-span-2 lg:col-span-3">
                    {text.clearContext}
                  </Button>
                </div>
              </details>

              <form
                onSubmit={event => {
                  event.preventDefault();
                  void submit();
                }}
                className="space-y-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={prompt}
                    onChange={event => setPrompt(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                    placeholder={text.inputPlaceholder}
                    className="min-h-16 flex-1 resize-none rounded-[1.5rem] border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
                  />
                  <Button type="submit" disabled={loading || !prompt.trim()} className="h-auto w-full rounded-[1.5rem] px-4 sm:w-auto">
                    {loading ? <RefreshCw className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                    <span className="hidden sm:inline">{text.send}</span>
                  </Button>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
              </form>

              {savedChats.length ? (
                <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{text.savedChats}</p>
                    <span className="text-xs text-muted-foreground">{savedChats.length}</span>
                  </div>
                  <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <select
                      value={selectedSavedChatId}
                      onChange={event => setSelectedSavedChatId(event.target.value)}
                      className="h-10 min-w-0 w-full flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm"
                    >
                      {savedChats.map(chat => (
                        <option key={chat.id} value={chat.id}>
                          {chat.title} · {text.updatedAt}{" "}
                          {new Date(chat.updatedAt).toLocaleDateString(locale === "en" ? "en-US" : "de-DE")}
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="outline" onClick={loadSavedChat} disabled={!selectedSavedChatId} className="w-full sm:w-auto">
                      <FolderOpen className="size-4" />
                      <span>{text.loadChat}</span>
                    </Button>
                    <Button type="button" variant="outline" onClick={deleteSavedChat} disabled={!selectedSavedChatId} className="w-full sm:w-auto">
                      <Trash2 className="size-4" />
                      <span>{text.deleteChat}</span>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AIPanelShell>
  );
}
