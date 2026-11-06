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
  Legend,
} from "recharts";

const API_URL = "http://localhost:8000";

const SERVICES = [
  { value: "nl_servers", label: "All .nl nameservers" },
  { value: "nl_servers-ns1.dns.nl", label: "ns1.dns.nl" },
  { value: "nl_servers-ns3.dns.nl", label: "ns3.dns.nl" },
  { value: "nl_servers-ns4.dns.nl", label: "ns4.dns.nl" },
];

interface Measurement {
  id: number;
  service: string;
  metric: string;
  start_period: string;
  data: {
    "num-sources-ipv4"?: number | null;
    "num-sources-ipv6"?: number | null;
    "num-sources-ipv6-aggregate"?: number | null;
  };
}

interface APIResponse {
  total: number;
  results: Measurement[];
}

interface ChartData {
  date: string;
  ipv4: number | null;
  ipv6: number | null;
  ipv6Aggregate: number | null;
}

const fetcher = async (url: string): Promise<APIResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load SIDN IPv6 data");
  }

  return response.json();
};

export default function SIDNIPv6Chart() {
  const [selectedService, setSelectedService] = useState("nl_servers");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = new URLSearchParams({
    metric: "unique-sources",
    service: selectedService,
    limit: "1000",
  });

  if (startDate) {
    params.set("start_date", `${startDate}T00:00:00+00:00`);
  }

  if (endDate) {
    params.set("end_date", `${endDate}T23:59:59+00:00`);
  }

  const { data, error, isLoading } = useSWR<APIResponse>(
    `${API_URL}/api/sidn/measurements?${params.toString()}`,
    fetcher
  );

  const chartData: ChartData[] = (data?.results ?? [])
    .map((measurement) => ({
      date: measurement.start_period,
      ipv4: measurement.data["num-sources-ipv4"] ?? null,
      ipv6: measurement.data["num-sources-ipv6"] ?? null,
      ipv6Aggregate:
        measurement.data["num-sources-ipv6-aggregate"] ?? null,
    }))
    .reverse();

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white">
          IPv4 & IPv6 Source Monitoring
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          Historical development of unique DNS query sources.
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
            Start date
          </label>

          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-slate-400">
            End date
          </label>

          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        {isLoading ? (
          <p className="text-slate-400">
            Loading IPv6 measurements...
          </p>
        ) : error ? (
          <p className="text-red-400">
            Could not load SIDN IPv6 data.
          </p>
        ) : chartData.length === 0 ? (
          <p className="text-slate-400">
            No measurements available for this period.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-400">
              {chartData.length.toLocaleString("en-US")} daily measurements
            </p>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
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
                    dataKey="date"
                    stroke="#94a3b8"
                    tickFormatter={(value: string) =>
                      new Date(value).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                    minTickGap={35}
                  />

                  <YAxis
                    stroke="#94a3b8"
                    tickFormatter={(value: number) =>
                      `${(value / 1_000).toFixed(0)}K`
                    }
                  />

                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(String(value)).toLocaleDateString("en-GB")
                    }
                    formatter={(value) => [
                      value == null
                        ? "Unavailable"
                        : Number(value).toLocaleString("en-US"),
                      "Sources",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="ipv4"
                    name="IPv4 sources"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="ipv6"
                    name="IPv6 sources"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="ipv6Aggregate"
                    name="IPv6 networks (/64)"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </section>
  );
}