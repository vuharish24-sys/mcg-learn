"use client";

import { useState } from "react";
import { ExternalLink, Plus, RefreshCw, Rss, Trash2, X, Video, Camera, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type Platform = "YOUTUBE" | "INSTAGRAM" | "RSS";

type Source = {
  id: string;
  name: string;
  platform: Platform;
  handle: string;
  isActive: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  keyPreview: string | null;
};

type SourceItem = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  externalUrl: string;
  publishedAt: string | null;
  source: { name: string; platform: Platform };
};

type Option = { value: string; label: string };

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Request failed");
  return payload.data;
}

const PLATFORM_LABEL: Record<Platform, string> = { YOUTUBE: "YouTube", INSTAGRAM: "Instagram", RSS: "Blog / RSS" };
const PLATFORM_ICON: Record<Platform, typeof Video> = { YOUTUBE: Video, INSTAGRAM: Camera, RSS: Rss };

export function ContentSourceManager({
  initialSources,
  initialItems,
  categories,
  learningPaths,
}: {
  initialSources: Source[];
  initialItems: SourceItem[];
  categories: Option[];
  learningPaths: Option[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchSummary, setFetchSummary] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addPlatform, setAddPlatform] = useState<Platform>("YOUTUBE");
  const [addName, setAddName] = useState("");
  const [addHandle, setAddHandle] = useState("");
  const [addApiKey, setAddApiKey] = useState("");
  const [adding, setAdding] = useState(false);

  const [categoryChoice, setCategoryChoice] = useState<Record<string, string>>({});

  async function refreshSources() {
    setSources(await api("/api/v1/content-sources", "GET"));
  }

  async function toggleActive(source: Source) {
    setBusyId(source.id);
    setError("");
    try {
      setSources(await api(`/api/v1/content-sources/${source.id}`, "PATCH", { isActive: !source.isActive }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update");
    } finally {
      setBusyId(null);
    }
  }

  async function saveRotatedKey(id: string) {
    if (!rotateValue.trim()) {
      setRotatingId(null);
      return;
    }
    setBusyId(id);
    setError("");
    try {
      setSources(await api(`/api/v1/content-sources/${id}`, "PATCH", { apiKey: rotateValue }));
      setRotatingId(null);
      setRotateValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update key");
    } finally {
      setBusyId(null);
    }
  }

  async function removeSource(source: Source) {
    if (!window.confirm(`Remove source "${source.name}"? This can't be undone.`)) return;
    setBusyId(source.id);
    setError("");
    try {
      setSources(await api(`/api/v1/content-sources/${source.id}`, "DELETE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove");
    } finally {
      setBusyId(null);
    }
  }

  async function addSource() {
    setAdding(true);
    setError("");
    try {
      const result = await api("/api/v1/content-sources", "POST", {
        platform: addPlatform,
        name: addName,
        handle: addHandle,
        apiKey: addApiKey || undefined,
        isActive: true,
      });
      setSources(result);
      setShowAdd(false);
      setAddName("");
      setAddHandle("");
      setAddApiKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add source");
    } finally {
      setAdding(false);
    }
  }

  async function fetchLatest() {
    setFetching(true);
    setError("");
    setFetchSummary("");
    try {
      const results = (await api("/api/v1/content-sources/fetch", "POST")) as {
        name: string;
        newCount: number;
        error: string | null;
      }[];
      const newTotal = results.reduce((sum, r) => sum + r.newCount, 0);
      const errors = results.filter((r) => r.error);
      setFetchSummary(
        `${newTotal} new item${newTotal === 1 ? "" : "s"} found` +
          (errors.length ? ` · ${errors.length} source(s) errored: ${errors.map((e) => `${e.name} (${e.error})`).join("; ")}` : ""),
      );
      setItems(await api("/api/v1/content-sources/items", "GET"));
      await refreshSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  async function importItem(itemId: string, target: "FEED" | "LEARNING_PATH", learningPathId?: string) {
    const categoryId = categoryChoice[itemId] ?? categories[0]?.value;
    if (!categoryId) {
      setError("Add a feed category first (Administration → Feed categories).");
      return;
    }
    setBusyId(itemId);
    setError("");
    try {
      await api(`/api/v1/content-sources/items/${itemId}/import`, "POST", { categoryId, target, learningPathId });
      setItems((current) => current.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import");
    } finally {
      setBusyId(null);
    }
  }

  async function dismissItem(itemId: string) {
    setBusyId(itemId);
    setError("");
    try {
      await api(`/api/v1/content-sources/items/${itemId}/dismiss`, "POST", {});
      setItems((current) => current.filter((i) => i.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to dismiss");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div>
        <h2 className="mb-3 text-lg font-bold">Sources</h2>
        <div className="grid gap-4">
          {sources.map((source) => {
            const Icon = PLATFORM_ICON[source.platform];
            return (
              <Card key={source.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="size-4 text-slate-500" />
                      <p className="font-semibold">{source.name}</p>
                      <Badge>{PLATFORM_LABEL[source.platform]}</Badge>
                      <Badge
                        className={
                          source.isActive
                            ? "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                            : "border border-slate-200 bg-transparent text-slate-500 dark:border-slate-700"
                        }
                      >
                        {source.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">{source.handle}</p>
                    {source.keyPreview && <p className="mt-0.5 font-mono text-xs text-slate-400">Key {source.keyPreview}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {source.lastFetchedAt ? `Last fetched ${formatDate(source.lastFetchedAt)}` : "Never fetched yet"}
                    </p>
                    {source.lastError && <p className="mt-1 text-xs text-red-600">Last error: {source.lastError}</p>}

                    {rotatingId === source.id ? (
                      <div className="mt-2 flex max-w-sm items-center gap-2">
                        <Input
                          type="password"
                          placeholder="New API key / token"
                          value={rotateValue}
                          onChange={(e) => setRotateValue(e.target.value)}
                        />
                        <Button size="sm" disabled={busyId === source.id} onClick={() => saveRotatedKey(source.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRotatingId(null); setRotateValue(""); }}>
                          Cancel
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" disabled={busyId === source.id} onClick={() => toggleActive(source)}>
                      {source.isActive ? "Pause" : "Activate"}
                    </Button>
                    {source.platform !== "RSS" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === source.id}
                        onClick={() => { setRotatingId(source.id); setRotateValue(""); }}
                      >
                        <KeyRound className="size-3.5" /> Rotate key
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busyId === source.id} className="text-red-700" onClick={() => removeSource(source)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {sources.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-500">No content sources configured yet.</CardContent>
            </Card>
          )}
        </div>

        {showAdd ? (
          <Card className="mt-4">
            <CardContent className="space-y-4 p-5">
              <p className="font-semibold">Add a source</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Platform</span>
                  <select className={fieldClassName} value={addPlatform} onChange={(e) => setAddPlatform(e.target.value as Platform)}>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="RSS">Blog / RSS</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Name</span>
                  <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. MCG YouTube Channel" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium">
                    {addPlatform === "YOUTUBE" ? "Channel ID or @handle" : addPlatform === "INSTAGRAM" ? "Instagram Business account user ID" : "Feed URL"}
                  </span>
                  <Input
                    value={addHandle}
                    onChange={(e) => setAddHandle(e.target.value)}
                    placeholder={addPlatform === "YOUTUBE" ? "@medicalcodingglobal" : addPlatform === "INSTAGRAM" ? "17841400000000000" : "https://example.com/feed"}
                  />
                </label>
                {addPlatform !== "RSS" && (
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium">
                      {addPlatform === "YOUTUBE" ? "YouTube Data API key" : "Instagram long-lived access token"}
                    </span>
                    <Input type="password" value={addApiKey} onChange={(e) => setAddApiKey(e.target.value)} />
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button
                  variant="gradient"
                  disabled={adding || addName.trim().length < 1 || addHandle.trim().length < 1 || (addPlatform !== "RSS" && addApiKey.trim().length < 5)}
                  onClick={addSource}
                >
                  {adding ? "Adding…" : "Add source"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="gradient" className="mt-4" onClick={() => setShowAdd(true)}>
            <Plus className="size-4" /> Add source
          </Button>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">New items</h2>
          <Button size="sm" variant="outline" disabled={fetching} onClick={fetchLatest}>
            <RefreshCw className={`size-3.5 ${fetching ? "animate-spin" : ""}`} /> {fetching ? "Fetching…" : "Fetch latest"}
          </Button>
        </div>
        {fetchSummary && <p className="mb-3 text-sm text-slate-500">{fetchSummary}</p>}

        <div className="grid gap-4">
          {items.map((item) => {
            const Icon = PLATFORM_ICON[item.source.platform];
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap gap-4 p-5">
                  {item.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" referrerPolicy="no-referrer" className="h-20 w-32 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="size-3.5 text-slate-500" />
                      <p className="font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{item.source.name}</span>
                      {item.publishedAt && <span>· {formatDate(item.publishedAt)}</span>}
                      <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline">
                        <ExternalLink className="size-3" /> View original
                      </a>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-col sm:items-stretch">
                    <select
                      className={`${fieldClassName} h-8 text-xs`}
                      value={categoryChoice[item.id] ?? categories[0]?.value ?? ""}
                      onChange={(e) => setCategoryChoice((current) => ({ ...current, [item.id]: e.target.value }))}
                    >
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <Button size="sm" disabled={busyId === item.id} onClick={() => importItem(item.id, "FEED")}>
                      Add to feed
                    </Button>
                    <select
                      className={`${fieldClassName} h-8 text-xs`}
                      value=""
                      disabled={busyId === item.id || learningPaths.length === 0}
                      onChange={(e) => {
                        if (e.target.value) importItem(item.id, "LEARNING_PATH", e.target.value);
                      }}
                    >
                      <option value="">Add to learning path…</option>
                      {learningPaths.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="ghost" disabled={busyId === item.id} className="text-red-700" onClick={() => dismissItem(item.id)}>
                      <X className="size-3.5" /> Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-500">
                No new items staged. Click &ldquo;Fetch latest&rdquo; to poll your configured sources.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
