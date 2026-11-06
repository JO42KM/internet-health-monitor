"use client";

import useSWR from "swr";
import SIDNTrafficChart from "@/components/sidn/SIDNTrafficChart";
import SIDNResponseCodeChart from "@/components/sidn/SIDNResponseCodeChart";
import SIDNTrafficSizeChart from "@/components/sidn/SIDNTrafficSizeChart";
import SIDNIPv6Chart from "@/components/sidn/SIDNIPv6Chart";

const API_URL = "http://localhost:8000";

interface SIDNSummary {
  total_measurements: number;
  metrics: {
    name: string;
    count: number;
  }[];
  services: {
    name: string;
    count: number;
  }[];
  oldest_measurement: string;
  newest_measurement: string;
}

const fetcher = async (url: string): Promise<SIDNSummary> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load SIDN data");
  }

  return response.json();
};

export default function SIDNMonitor() {
  const { data, error, isLoading } = useSWR<SIDNSummary>(
    `${API_URL}/api/sidn/summary`,
    fetcher,
    {
      refreshInterval: 60000,
    }
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <p className="text-slate-400">Loading SIDN data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950/30 p-6">
        <p className="text-red-400">
          Could not connect to the SIDN API. Check whether the backend is running.
        </p>
      </div>
    );
  }

  const oldestDate = new Date(
    data.oldest_measurement
  ).toLocaleDateString("en-GB");

  const newestDate = new Date(
    data.newest_measurement
  ).toLocaleDateString("en-GB");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          SIDN Labs Monitoring
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Historical DNS infrastructure measurements from the .nl
          authoritative nameservers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Total measurements
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {data.total_measurements.toLocaleString("en-US")}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Metric categories
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {data.metrics.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Monitored services
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {data.services.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Available metrics
          </h3>

          <div className="space-y-3">
            {data.metrics.map((metric) => (
              <div
                key={metric.name}
                className="flex items-center justify-between border-b border-slate-800 pb-3"
              >
                <span className="text-sm text-slate-300">
                  {metric.name}
                </span>
                <span className="text-sm font-medium text-white">
                  {metric.count.toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Monitored services
          </h3>

          <div className="space-y-3">
            {data.services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between border-b border-slate-800 pb-3"
              >
                <span className="text-sm text-slate-300">
                  {service.name}
                </span>
                <span className="text-sm font-medium text-white">
                  {service.count.toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold text-white">
          Historical coverage
        </h3>

        <div className="mt-3 flex flex-wrap gap-8">
          <div>
            <p className="text-sm text-slate-400">Oldest measurement</p>
            <p className="mt-1 font-medium text-white">{oldestDate}</p>
          </div>

          <div>
            <p className="text-sm text-slate-400">Newest measurement</p>
            <p className="mt-1 font-medium text-white">{newestDate}</p>
          </div>
        </div>
      </div>
      <SIDNTrafficChart />
      <SIDNResponseCodeChart />
      <SIDNIPv6Chart />
        <SIDNTrafficSizeChart />
    </section>
    
  );
}