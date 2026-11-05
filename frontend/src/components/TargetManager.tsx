"use client";

import { useState } from "react";
import useSWR from "swr";

interface MonitoringTarget {
  id: number;
  name: string;
  target: string;
  is_active: boolean;
  created_at: string;
}

const API_URL = "http://localhost:8000";

async function fetcher(url: string): Promise<MonitoringTarget[]> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not retrieve monitoring targets");
  }

  return response.json();
}

export default function TargetManager() {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const {
    data: targets = [],
    error,
    isLoading,
    mutate,
  } = useSWR<MonitoringTarget[]>(
    `${API_URL}/api/targets/`,
    fetcher
  );

  async function addTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/targets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, target }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not add target");
      }

      setName("");
      setTarget("");
      await mutate();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleTarget(item: MonitoringTarget) {
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/targets/${item.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !item.is_active }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not update target");
      }

      await mutate();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }

  async function saveEdit(id: number) {
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/targets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not rename target");
      }

      setEditingId(null);
      setEditName("");
      await mutate();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }

  async function deleteTarget(id: number) {
    if (!window.confirm("Are you sure you want to delete this target?")) {
      return;
    }

    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/targets/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not delete target");
      }

      await mutate();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Monitoring Targets
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Add and manage the websites and IP addresses you want to monitor.
        </p>
      </div>

      {/* Add target form */}
      <form
        onSubmit={addTarget}
        className="grid grid-cols-1 gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 md:grid-cols-3"
      >
        <div>
          <label className="mb-2 block text-sm text-gray-400">
            Target name
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Cloudflare"
            required
            maxLength={100}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-400">
            Hostname or IP address
          </label>
          <input
            type="text"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="1.1.1.1 or example.nl"
            required
            maxLength={253}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Target"}
          </button>
        </div>
      </form>

      {/* Error message */}
      {errorMessage && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Target list */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 p-5">
          <h3 className="font-semibold text-white">
            Saved Targets ({targets.length})
          </h3>
        </div>

        {isLoading ? (
          <p className="p-6 text-gray-400">Loading targets...</p>
        ) : error ? (
          <p className="p-6 text-red-400">
            Could not load targets. Check whether the backend is running.
          </p>
        ) : targets.length === 0 ? (
          <p className="p-6 text-gray-400">
            No monitoring targets added yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-800">
            {targets.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  {editingId === item.id ? (
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="truncate font-medium text-white">
                        {item.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        {item.target}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.is_active
                        ? "bg-green-950 text-green-400"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {item.is_active ? "Active" : "Disabled"}
                  </span>

                  <button
                    onClick={() => toggleTarget(item)}
                    className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    {item.is_active ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                    }}
                    className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    Rename
                  </button>

                  <button
                    onClick={() => deleteTarget(item.id)}
                    className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}