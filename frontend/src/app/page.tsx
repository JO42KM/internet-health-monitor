"use client";

import { useEffect, useState } from "react";

interface HealthData {
  status: string;
  timestamp: string;
}

interface DNSResult {
  domain: string;
  answers: string[];
  response_time_ms: number;
  status: string;
}

export default function Home() {
  const [backend, setBackend] = useState("Checking...");
  const [health, setHealth] = useState<HealthData | null>(null);

  const [domain, setDomain] = useState("sidn.nl");
  const [dnsResult, setDnsResult] = useState<DNSResult | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsError, setDnsError] = useState("");

  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await fetch("http://localhost:8000/api/health");

        if (!response.ok) throw new Error("Backend unavailable");

        const data: HealthData = await response.json();

        setHealth(data);
        setBackend("Online");
      } catch {
        setBackend("Offline");
      }
    }

    checkBackend();
  }, []);

  async function measureDNS() {
    setDnsLoading(true);
    setDnsError("");
    setDnsResult(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/dns/${encodeURIComponent(domain)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "DNS measurement failed");
      }

      setDnsResult(data);
    } catch (error) {
      setDnsError(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setDnsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Header */}

        <header className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium tracking-widest text-cyan-400">
              NATIONAL INTERNET OBSERVATORY
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Internet Health Monitor
            </h1>

            <p className="mt-2 text-slate-400">
              Monitoring the health of Dutch internet infrastructure.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
            <p className="text-xs text-slate-400">SYSTEM STATUS</p>

            <p className="mt-1 font-semibold">
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${
                  backend === "Online"
                    ? "bg-green-400"
                    : "bg-red-400"
                }`}
              />
              {backend}
            </p>
          </div>
        </header>

        {/* Overview */}

        <section>
          <h2 className="mb-5 text-lg font-semibold">
            Infrastructure overview
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <MetricCard
              title="Backend"
              value={backend}
              description="API availability"
            />

            <MetricCard
              title="DNS monitoring"
              value="Available"
              description="Manual DNS measurements"
            />

            <MetricCard
              title="IPv6 monitoring"
              value="Coming soon"
              description="IPv6 connectivity"
            />

            <MetricCard
              title="Network monitoring"
              value="Coming soon"
              description="Latency and packet loss"
            />

          </div>
        </section>

        {/* DNS Monitor */}

        <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              DNS Intelligence
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Perform a DNS lookup and measure its response time.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter a domain"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />

            <button
              onClick={measureDNS}
              disabled={dnsLoading || !domain.trim()}
              className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {dnsLoading ? "Measuring..." : "Run DNS test"}
            </button>

          </div>

          {dnsError && (
            <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-300">
              {dnsError}
            </div>
          )}

          {dnsResult && (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-5">

              <div className="flex flex-wrap justify-between gap-3">
                <h3 className="font-semibold">
                  Results for {dnsResult.domain}
                </h3>

                <span className="text-sm text-green-400">
                  ● {dnsResult.status}
                </span>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">

                <div>
                  <p className="text-sm text-slate-400">
                    Response time
                  </p>

                  <p className="mt-1 text-3xl font-bold text-cyan-400">
                    {dnsResult.response_time_ms} ms
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">
                    IP addresses
                  </p>

                  {dnsResult.answers.map((ip) => (
                    <p key={ip} className="mt-1 font-mono text-sm">
                      {ip}
                    </p>
                  ))}
                </div>

              </div>
            </div>
          )}

        </section>

        {/* Footer */}

        <footer className="mt-16 border-t border-slate-800 pt-6 text-sm text-slate-500">
          Internet Health Monitor · Early development
          <span className="float-right">
            {health
              ? `Last API check: ${new Date(
                  health.timestamp
                ).toLocaleTimeString()}`
              : "Waiting for API"}
          </span>
        </footer>

      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-3 text-2xl font-bold">{value}</p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}