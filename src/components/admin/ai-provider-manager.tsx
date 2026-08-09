"use client";

import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { AiProviderType } from "@prisma/client";

type Config = {
  id: string;
  providerType: AiProviderType;
  label: string;
  enabled: boolean;
  priority: number;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  keyPreview: string;
};

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Request failed");
  return payload.data as Config[];
}

export function AiProviderManager({ initialConfigs }: { initialConfigs: Config[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addProviderType, setAddProviderType] = useState<AiProviderType>("GEMINI");
  const [addLabel, setAddLabel] = useState("");
  const [addApiKey, setAddApiKey] = useState("");
  const [addPriority, setAddPriority] = useState("0");
  const [adding, setAdding] = useState(false);

  async function toggleEnabled(config: Config) {
    setBusyId(config.id);
    setError("");
    try {
      setConfigs(await api(`/api/v1/ai-providers/${config.id}`, "PATCH", { enabled: !config.enabled }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update");
    } finally {
      setBusyId(null);
    }
  }

  async function updatePriority(config: Config, priority: number) {
    setBusyId(config.id);
    setError("");
    try {
      setConfigs(await api(`/api/v1/ai-providers/${config.id}`, "PATCH", { priority }));
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
      setConfigs(await api(`/api/v1/ai-providers/${id}`, "PATCH", { apiKey: rotateValue }));
      setRotatingId(null);
      setRotateValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update key");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(config: Config) {
    if (!window.confirm(`Remove "${config.label}"? This can't be undone.`)) return;
    setBusyId(config.id);
    setError("");
    try {
      setConfigs(await api(`/api/v1/ai-providers/${config.id}`, "DELETE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove");
    } finally {
      setBusyId(null);
    }
  }

  async function addProvider() {
    setAdding(true);
    setError("");
    try {
      const result = await api("/api/v1/ai-providers", "POST", {
        providerType: addProviderType,
        label: addLabel,
        apiKey: addApiKey,
        priority: Number(addPriority) || 0,
        enabled: true,
      });
      setConfigs(result);
      setShowAdd(false);
      setAddLabel("");
      setAddApiKey("");
      setAddPriority("0");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add provider");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{config.label}</p>
                  <Badge>{config.providerType}</Badge>
                  <Badge
                    className={
                      config.enabled
                        ? "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                        : "border border-slate-200 bg-transparent text-slate-500 dark:border-slate-700"
                    }
                  >
                    {config.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{config.keyPreview}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Priority {config.priority} (lower tries first)
                  {config.lastUsedAt ? ` · Last used ${formatDate(config.lastUsedAt)}` : " · Never used yet"}
                </p>
                {config.lastError && (
                  <p className="mt-1 text-xs text-red-600">Last error: {config.lastError}</p>
                )}

                {rotatingId === config.id ? (
                  <div className="mt-2 flex max-w-sm items-center gap-2">
                    <Input
                      type="password"
                      placeholder="New API key"
                      value={rotateValue}
                      onChange={(e) => setRotateValue(e.target.value)}
                    />
                    <Button size="sm" disabled={busyId === config.id} onClick={() => saveRotatedKey(config.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRotatingId(null); setRotateValue(""); }}>
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  Priority
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    defaultValue={config.priority}
                    className="h-8 w-16 rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isNaN(value) && value !== config.priority) updatePriority(config, value);
                    }}
                  />
                </label>
                <Button size="sm" variant="outline" disabled={busyId === config.id} onClick={() => toggleEnabled(config)}>
                  {config.enabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === config.id}
                  onClick={() => { setRotatingId(config.id); setRotateValue(""); }}
                >
                  <KeyRound className="size-3.5" /> Rotate key
                </Button>
                <Button size="sm" variant="outline" disabled={busyId === config.id} className="text-red-700" onClick={() => remove(config)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {configs.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              No AI providers configured yet. Add one below, or set GEMINI_API_KEY / GROQ_API_KEY as
              environment variables as a fallback.
            </CardContent>
          </Card>
        )}
      </div>

      {showAdd ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="font-semibold">Add a provider</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Provider</span>
                <select
                  className={fieldClassName}
                  value={addProviderType}
                  onChange={(e) => setAddProviderType(e.target.value as AiProviderType)}
                >
                  <option value="GEMINI">Gemini</option>
                  <option value="GROQ">Groq</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Label</span>
                <Input value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="e.g. Gemini (primary)" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">API key</span>
                <Input type="password" value={addApiKey} onChange={(e) => setAddApiKey(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Priority</span>
                <Input type="number" min={0} max={1000} value={addPriority} onChange={(e) => setAddPriority(e.target.value)} />
                <p className="mt-1 text-xs text-slate-500">Lower numbers are tried first.</p>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                variant="gradient"
                disabled={adding || addLabel.trim().length < 1 || addApiKey.trim().length < 10}
                onClick={addProvider}
              >
                {adding ? "Adding…" : "Add provider"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="gradient" onClick={() => setShowAdd(true)}>
          <Plus className="size-4" /> Add provider
        </Button>
      )}
    </div>
  );
}
