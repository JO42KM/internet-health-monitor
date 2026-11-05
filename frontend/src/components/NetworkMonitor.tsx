"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface MonitoringTarget {
  id: number;
  name: string;
  target: string;
  is_active: boolean;
  created_at: string;
}

interface Measurement {
  id: number;
  target: string;
  status: string;
  packets_transmitted: number | null;
  packets_received: number | null;
  packet_loss_percent: number | null;
  latency_min_ms: number | null;
  latency_avg_ms: number | null;
  latency_max_ms: number | null;
  jitter_ms: number | null;
  timestamp: string;
}

const API_URL = "http://localhost:8000";

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not retrieve data");
  }

  return response.json();
}

export default function NetworkMonitor() {
  const [selectedTarget, setSelectedTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const {
    data: targets = [],
    error: targetsError,
    isLoading: targetsLoading,
  } = useSWR<MonitoringTarget[]>(
    `${API_URL}/api/targets/`,
    fetcher
  );

  const activeTargets = targets.filter((item) => item.is_active);
  const effectiveTarget = activeTargets.some(
    (item) => item.target === selectedTarget
  )
  ? selectedTarget
  : activeTargets[0]?.target ?? "";

  const {
    data: measurements = [],
    error: historyError,
    isLoading: historyLoading,
    mutate,
  } = useSWR<Measurement[]>(
    effectiveTarget
      ? `${API_URL}/api/network/history/${encodeURIComponent(effectiveTarget)}`
      : null,
    fetcher
  );

  async function runMeasurement() {
    if (!effectiveTarget) return;

    setLoading(true);
    setActionError("");

    try {
      const response = await fetch(
        `${API_URL}/api/network/latency/${encodeURIComponent(effectiveTarget)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Measurement failed");
      }

      await mutate();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not perform network measurement."
      );
    } finally {
      setLoading(false);
    }
  }

  const latest = measurements[0];

  const chartData = [...measurements]
    .reverse()
    .filter((item) => item.latency_avg_ms !== null)
    .map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      latency: item.latency_avg_ms,
    }));

  if (targetsLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        Loading monitoring targets...
      </div>
    );
  }

  if (targetsError) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-red-300">
        Could not load monitoring targets. Check whether the backend is running.
      </div>
    );
  }

  if (activeTargets.length === 0) {
    return (
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-8">
        <h2 className="text-2xl font-bold text-white">
          Network Monitoring
        </h2>
        <p className="mt-3 text-gray-400">
          There are no active monitoring targets. Add a target and enable it
          in the Monitoring Targets section first.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header and target selector */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Network Monitoring
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Select a saved target to view its network performance.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={effectiveTarget}
            onChange={(event) => setSelectedTarget(event.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white outline-none focus:border-blue-500"
          >
            {activeTargets.map((item) => (
              <option key={item.id} value={item.target}>
                {item.name} ({item.target})
              </option>
            ))}
          </select>

          <button
            onClick={runMeasurement}
            disabled={loading || !effectiveTarget}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Measuring..." : "Run Measurement"}
          </button>
        </div>
      </div>

      {/* Errors */}
      {actionError && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          {actionError}
        </div>
      )}

      {historyError && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          Could not load network history for this target.
        </div>
      )}

      {/* Loading history */}
      {historyLoading ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
          Loading network measurements...
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Average Latency",
                value:
                  latest?.latency_avg_ms != null
                    ? `${latest.latency_avg_ms.toFixed(2)} ms`
                    : "—",
              },
              {
                label: "Packet Loss",
                value:
                  latest?.packet_loss_percent != null
                    ? `${latest.packet_loss_percent}%`
                    : "—",
              },
              {
                label: "RTT Variation",
                value:
                  latest?.jitter_ms != null
                    ? `${latest.jitter_ms.toFixed(2)} ms`
                    : "—",
              },
              {
                label: "Status",
                value: latest?.status ?? "No data",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-gray-800 bg-gray-900 p-5"
              >
                <p className="text-sm text-gray-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* Latency chart */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-6 text-lg font-semibold text-white">
              Latency History
            </h3>

            {chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                    />
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" unit=" ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={true}
                      name="Average latency"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-12 text-center text-gray-500">
                No latency history available for this target yet.
              </p>
            )}
          </div>

          {/* Recent measurements */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Recent Measurements
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-700 text-gray-400">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">Packet Loss</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {measurements.slice(0, 10).map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-800 text-gray-300"
                    >
                      <td className="p-3">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3">
                        {item.latency_avg_ms != null
                          ? `${item.latency_avg_ms.toFixed(2)} ms`
                          : "—"}
                      </td>
                      <td className="p-3">
                        {item.packet_loss_percent != null
                          ? `${item.packet_loss_percent}%`
                          : "—"}
                      </td>
                      <td className="p-3">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}