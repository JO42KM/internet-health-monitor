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
const TARGET = "1.1.1.1";

async function fetcher(url: string): Promise<Measurement[]> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not retrieve network history");
  }

  return response.json();
}

export default function NetworkMonitor() {
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const {
    data: measurements = [],
    error: historyError,
    isLoading: historyLoading,
    mutate,
  } = useSWR<Measurement[]>(
    `${API_URL}/api/network/history/${TARGET}`,
    fetcher
  );

  async function runMeasurement() {
    setLoading(true);
    setActionError("");

    try {
      const response = await fetch(
        `${API_URL}/api/network/latency/${TARGET}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Measurement failed");
      }

      await mutate();
    } catch {
      setActionError("Could not perform network measurement.");
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

  if (historyLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        Loading network measurements...
      </div>
    );
  }

  if (historyError) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-red-300">
        Unable to load network history. Check whether the backend is running.
      </div>
    );
  }

  return (
    <section className="space-y-6">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Network Monitoring
          </h2>
          <p className="text-sm text-gray-400">
            Monitoring target: {TARGET}
          </p>
        </div>

        <button
          onClick={runMeasurement}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Measuring..." : "Run Measurement"}
        </button>
      </div>

      {/* Error */}
      {actionError && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          {actionError}
        </div>
      )}

      {/* Metric Cards */}
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
            label: "Jitter",
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
            <p className="text-sm text-gray-400">
              {metric.label}
            </p>

            <p className="mt-2 text-2xl font-semibold text-white">
              {metric.value}
            </p>
          </div>
        ))}

      </div>

      {/* Latency Chart */}
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

                <XAxis
                  dataKey="time"
                  stroke="#9CA3AF"
                />

                <YAxis
                  stroke="#9CA3AF"
                  unit=" ms"
                />

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
            No latency history available yet.
          </p>
        )}

      </div>

      {/* Recent Measurements */}
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

                  <td className="p-3">
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>

    </section>
  );
}