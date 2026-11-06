"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_URL = "http://localhost:8000";

const SERVICES = [
  { value: "nl_servers", label: "All .nl nameservers" },
  { value: "nl_servers-ns1.dns.nl", label: "ns1.dns.nl" },
  { value: "nl_servers-ns3.dns.nl", label: "ns3.dns.nl" },
  { value: "nl_servers-ns4.dns.nl", label: "ns4.dns.nl" },
];

type Protocol = "udp" | "tcp";
type Direction = "request" | "response";

interface Measurement {
  id: number;
  service: string;
  metric: string;
  start_period: string;
  data: Record<string, Record<string, number>>;
}

interface APIResponse {
  total: number;
  results: Measurement[];
}

interface ChartData {
  size: string;
  queries: number;
}

const fetcher = async (url: string): Promise<APIResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load SIDN traffic-size data");
  }

  return response.json();
};

export default function SIDNTrafficSizeChart() {
  const [selectedService, setSelectedService] = useState("nl_servers");
  const [protocol, setProtocol] = useState<Protocol>("udp");
  const [direction, setDirection] = useState<Direction>("response");

  const { data, error, isLoading } = useSWR<APIResponse>(
    `${API_URL}/api/sidn/measurements?metric=traffic-sizes&service=${encodeURIComponent(selectedService)}&limit=1000`,
    fetcher
  );

  const dataKey = `${protocol}-${direction}-sizes`;

  const totals: Record<string, number> = {};

  for (const measurement of data?.results ?? []) {
    const buckets = measurement.data[dataKey] ?? {};

    for (const [size, count] of Object.entries(buckets)) {
      if (typeof count === "number") {
        totals[size] = (totals[size] ?? 0) + count;
      }
    }
  }

  const chartData: ChartData[] = Object.entries(totals)
    .map(([size, queries]) => ({
      size,
      queries,
    }))
    .sort((a, b) => {
      const lowerA = Number(a.size.split("-")[0]);
      const lowerB = Number(b.size.split("-")[0]);
      return lowerA - lowerB;
    });

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white">
          DNS Traffic Size Distribution
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          Distribution of DNS packet sizes across the selected traffic type.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="block text-sm text-slate-400">
            Nameserver
          </label>

          <select
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            {SERVICES.map((service) => (
              <option key={service.value} value={service.value}>
                {service.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-slate-400">
            Protocol
          </label>

          <select
            value={protocol}
            onChange={(event) =>
              setProtocol(event.target.value as Protocol)
            }
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="udp">UDP</option>
            <option value="tcp">TCP</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-slate-400">
            Traffic direction
          </label>

          <select
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as Direction)
            }
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="request">Requests</option>
            <option value="response">Responses</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        {isLoading ? (
          <p className="text-slate-400">
            Loading traffic-size measurements...
          </p>
        ) : error ? (
          <p className="text-red-400">
            Could not load SIDN traffic-size data.
          </p>
        ) : chartData.length === 0 ? (
          <p className="text-slate-400">
            No traffic-size measurements available.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-400">
              {chartData.length} packet-size ranges ·{" "}
              {data?.total.toLocaleString("en-US")} daily measurements
            </p>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 20,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="size"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Packet size (bytes)",
                      position: "insideBottom",
                      offset: -5,
                      fill: "#94a3b8",
                    }}
                  />

                  <YAxis
                    scale="log"
                    domain={[1, "auto"]}
                    stroke="#94a3b8"
                    tickFormatter={(value: number) =>
                      value >= 1_000_000
                        ? `${(value / 1_000_000).toFixed(0)}M`
                        : value >= 1_000
                          ? `${(value / 1_000).toFixed(0)}K`
                          : value.toString()
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      Number(value).toLocaleString("en-US"),
                      "Packets",
                    ]}
                    labelFormatter={(label) =>
                      `${label} bytes`
                    }
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />

                  <Bar
                    dataKey="queries"
                    name="Packets"
                    fill="#38bdf8"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </section>
  );
}