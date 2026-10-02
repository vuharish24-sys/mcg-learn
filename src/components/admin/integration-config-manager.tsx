"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type ConfigGroup = "practiceLab" | "razorpay" | "wordpress" | "email" | "whatsapp";

type ConfigView = {
  key: string;
  group: ConfigGroup;
  label: string;
  secret: boolean;
  help: string | null;
  source: "env" | "database" | "default" | "unset";
  preview: string | null;
  hasDatabaseValue: boolean;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

type Data = {
  groups: Record<ConfigGroup, { label: string; description: string }>;
  configs: ConfigView[];
};

const TESTABLE: ConfigGroup[] = ["practiceLab", "razorpay", "wordpress"];

const SOURCE_BADGE: Record<ConfigView["source"], { label: string; className: string }> = {
  database: {
    label: "Saved here",
    className: "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300",
  },
  env: {
    label: "Environment variable",
    className: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  },
  default: {
    label: "Default",
    className: "border border-slate-200 bg-transparent text-slate-500 dark:border-slate-700",
  },
  unset: {
    label: "Not set",
    className: "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  },
};

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Request failed");
  return payload.data as T;
}

export function IntegrationConfigManager({ initialData }: { initialData: Data }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [testing, setTesting] = useState<ConfigGroup | null>(null);
  const [testResults, setTestResults] = useState<Partial<Record<ConfigGroup, { ok: boolean; message: string }>>>({});

  async function save(key: string) {
    setBusyKey(key);
    setError("");
    try {
      setData(await api<Data>("/api/v1/integration-configs", "PUT", { key, value: editValue }));
      setEditingKey(null);
      setEditValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusyKey(null);
    }
  }

  async function clear(config: ConfigView) {
    if (!window.confirm(`Remove the saved value for "${config.label}"?`)) return;
    setBusyKey(config.key);
    setError("");
    try {
      setData(await api<Data>("/api/v1/integration-configs", "DELETE", { key: config.key }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove");
    } finally {
      setBusyKey(null);
    }
  }

  async function test(group: ConfigGroup) {
    setTesting(group);
    try {
      const result = await api<{ ok: boolean; message: string }>("/api/v1/integration-configs/test", "POST", { group });
      setTestResults((current) => ({ ...current, [group]: result }));
    } catch (e) {
      setTestResults((current) => ({
        ...current,
        [group]: { ok: false, message: e instanceof Error ? e.message : "Test failed" },
      }));
    } finally {
      setTesting(null);
    }
  }

  const groups = Object.keys(data.groups) as ConfigGroup[];

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {groups.map((group) => {
        const result = testResults[group];
        return (
          <Card key={group}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>{data.groups[group].label}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{data.groups[group].description}</p>
              </div>
              {TESTABLE.includes(group) && (
                <Button size="sm" variant="outline" disabled={testing === group} onClick={() => test(group)}>
                  {testing === group ? "Testing…" : "Test connection"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {result && (
                <p
                  className={`rounded-lg p-3 text-sm ${
                    result.ok ? "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200" : "bg-red-50 text-red-700"
                  }`}
                >
                  {result.message}
                </p>
              )}
              {data.configs
                .filter((config) => config.group === group)
                .map((config) => (
                  <div
                    key={config.key}
                    className="flex flex-wrap items-start justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0 dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{config.label}</p>
                        <Badge className={SOURCE_BADGE[config.source].className}>{SOURCE_BADGE[config.source].label}</Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{config.key}</p>
                      {config.preview && (
                        <p className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">{config.preview}</p>
                      )}
                      {config.help && <p className="mt-1 text-xs text-slate-500">{config.help}</p>}
                      {config.source === "env" && config.hasDatabaseValue && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          A value is also saved here, but the environment variable overrides it.
                        </p>
                      )}
                      {config.source === "env" && !config.hasDatabaseValue && (
                        <p className="mt-1 text-xs text-slate-500">
                          Set on the server. Saving a value here only takes effect once that variable is removed.
                        </p>
                      )}
                      {config.updatedAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          Saved {formatDate(config.updatedAt)}
                          {config.updatedByEmail ? ` by ${config.updatedByEmail}` : ""}
                        </p>
                      )}

                      {editingKey === config.key && (
                        <div className="mt-2 flex max-w-md flex-wrap items-center gap-2">
                          <Input
                            type={config.secret ? "password" : "text"}
                            autoComplete="off"
                            placeholder={config.secret ? "New value (hidden)" : "Value"}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                          <Button size="sm" disabled={busyKey === config.key || !editValue.trim()} onClick={() => save(config.key)}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingKey(null);
                              setEditValue("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingKey !== config.key && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyKey === config.key}
                          onClick={() => {
                            setEditingKey(config.key);
                            setEditValue(config.secret || !config.hasDatabaseValue ? "" : (config.preview ?? ""));
                          }}
                        >
                          {config.hasDatabaseValue ? "Change" : "Set"}
                        </Button>
                        {config.hasDatabaseValue && (
                          <Button size="sm" variant="outline" disabled={busyKey === config.key} onClick={() => clear(config)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
