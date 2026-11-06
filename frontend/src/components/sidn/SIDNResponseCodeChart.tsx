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
  { value: "nl_servers", label: "All .nl nameservers (aggregate)" },
  { value: "nl_servers-ns1.dns.nl", label: "ns1.dns.nl" },
  { value: "nl_servers-ns3.dns.nl", label: "ns3.dns.nl" },
  { value: "nl_servers-ns4.dns.nl", label: "ns4.dns.nl" },
];

const RCODE_LABELS: Record<string, string> = {
  "-1": "Unknown",
  "0": "NOERROR",
  "1": "FORMERR",
  "2": "SERVFAIL",
  "3": "NXDOMAIN",
  "4": "NOTIMP",
  "5": "REFUSED",
  "9": "NOTAUTH",
  "16": "BADVERS / BADSIG",
};

interface Measurement {
  id: number;
  service: string;
  metric: string;
  start_period: string;
  data: Record<string, number | null>;
}

interface APIResponse {
  total: number;
  results: Measurement[];
}

interface ChartData {
  code: string;
  name: string;
  queries: number;
}

const fetcher = async (url: string): Promise<APIResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load SIDN response-code data");
  }

  return response.json();
};

export default function SIDNResponseCodeChart() {
  const [selectedService, setSelectedService] = useState("nl_servers");

  const { data, error, isLoading } = useSWR<APIResponse>(
    `${API_URL}/api/sidn/measurements?metric=rcode-volume&service=${encodeURIComponent(selectedService)}&limit=1000`,
    fetcher
  );

  const totals: Record<string, number> = {};

  for (const measurement of data?.results ?? []) {
    for (const [code, value] of Object.entries(measurement.data)) {
      if (typeof value === "number") {
        totals[code] = (totals[code] ?? 0) + value;
      }
    }
  }

  const chartData: ChartData[] = Object.entries(totals)
    .map(([code, queries]) => ({
      code,
      name: RCODE_LABELS[code] ?? `RCODE ${code}`,
      queries,
    }))
    .sort((a, b) => b.queries - a.queries);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">
            DNS Response Codes
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Total DNS responses grouped by response code across the imported
            measurement period.
          </p>
        </div>

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

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        {isLoading ? (
          <p className="text-slate-400">
            Loading response-code measurements...
          </p>
        ) : error ? (
          <p className="text-red-400">
            Could not load SIDN response-code data.
          </p>
        ) : chartData.length === 0 ? (
          <p className="text-slate-400">
            No response-code measurements available.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-400">
              {data?.total.toLocaleString("en-US")} daily measurements
            </p>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    stroke="#94a3b8"
                    tickFormatter={(value: number) =>
                      `${(value / 1_000_000).toFixed(0)}M`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      Number(value).toLocaleString("en-US"),
                      "Queries",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />

                  <Bar
                    dataKey="queries"
                    name="DNS Queries"
                    fill="#38bdf8"
                    radius={[5, 5, 0, 0]}
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