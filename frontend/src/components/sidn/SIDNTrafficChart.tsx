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
  { value: "nl_servers", label: "All .nl nameservers (aggregate)" },
  { value: "nl_servers-ns1.dns.nl", label: "ns1.dns.nl" },
  { value: "nl_servers-ns3.dns.nl", label: "ns3.dns.nl" },
  { value: "nl_servers-ns4.dns.nl", label: "ns4.dns.nl" },
];

interface TrafficMeasurement {
  id: number;
  service: string;
  metric: string;
  start_period: string;
  data: {
    "dns-udp-queries-received-ipv4"?: number;
    "dns-udp-queries-received-ipv6"?: number;
    "dns-tcp-queries-received-ipv4"?: number;
    "dns-tcp-queries-received-ipv6"?: number;
  };
}

interface APIResponse {
  total: number;
  limit: number;
  offset: number;
  results: TrafficMeasurement[];
}

interface ChartData {
  date: string;
  ipv4: number;
  ipv6: number;
}

const fetcher = async (url: string): Promise<APIResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load SIDN traffic data");
  }

  return response.json();
};

export default function SIDNTrafficChart() {
  const [selectedService, setSelectedService] = useState("nl_servers");

  const { data, error, isLoading } = useSWR<APIResponse>(
    `${API_URL}/api/sidn/measurements?metric=traffic-volume&service=${encodeURIComponent(selectedService)}&limit=1000`,
    fetcher
  );

  const chartData: ChartData[] = (data?.results ?? [])
    .map((measurement) => {
      const values = measurement.data;

      const ipv4 =
        (values["dns-udp-queries-received-ipv4"] ?? 0) +
        (values["dns-tcp-queries-received-ipv4"] ?? 0);

      const ipv6 =
        (values["dns-udp-queries-received-ipv6"] ?? 0) +
        (values["dns-tcp-queries-received-ipv6"] ?? 0);

      return {
        date: measurement.start_period,
        ipv4,
        ipv6,
      };
    })
    .reverse();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">
            DNS Traffic Volume
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Daily DNS queries received over IPv4 and IPv6.
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
          <p className="text-slate-400">Loading traffic measurements...</p>
        ) : error ? (
          <p className="text-red-400">
            Could not load SIDN traffic data.
          </p>
        ) : chartData.length === 0 ? (
          <p className="text-slate-400">
            No traffic measurements available.
          </p>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-400">
              {chartData.length.toLocaleString("en-US")} measurements
              displayed
            </div>

            <div className="h-[350px] w-full">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

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
                      `${(value / 1_000_000).toFixed(0)}M`
                    }
                  />

                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(String(value)).toLocaleDateString("en-GB")
                    }
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

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="ipv4"
                    name="IPv4"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="ipv6"
                    name="IPv6"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
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