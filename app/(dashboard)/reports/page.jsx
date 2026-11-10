"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Panel } from "@/components/ui";
import DataTable from "@/components/ui/DataTable";
import { api } from "@/lib/api";

const maskIncidentId = (id) => {
  const value = String(id ?? "");
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
};

const columns = [
  {
    accessorKey: "id",
    header: "Incident ID",
    cell: ({ row }) => maskIncidentId(row.original.id),
  },
  { accessorKey: "fisher", header: "Fisher" },
  { accessorKey: "when", header: "Date and time" },
  { accessorKey: "location", header: "Location" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "response", header: "Response time" },
];

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadCsv(rows) {
  const header = columns.map((column) => csvCell(column.header)).join(",");

  const lines = rows.map((row) =>
    columns.map((column) => csvCell(row[column.accessorKey])).join(","),
  );

  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `MvuviGo-Incident-Report-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

const minutesOf = (text) => {
  const match = /(\d+(?:\.\d+)?)/.exec(String(text ?? ""));
  return match ? Number(match[1]) : null;
};

const dayOf = (row) => {
  const timestamp = Date.parse(row.date ?? row.when);
  return Number.isNaN(timestamp)
    ? null
    : new Date(timestamp).setHours(0, 0, 0, 0);
};

function getReportTimestamp(record) {
  return Date.parse(
    record.date ??
      record.when ??
      record.triggered_at ??
      record.triggeredAt ??
      "",
  );
}

function getIncidentId(record) {
  return record.alert_id ?? record.id ?? null;
}

function formatReportRecords(records) {
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = getReportTimestamp(a);
    const timeB = getReportTimestamp(b);

    if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
    if (Number.isNaN(timeA)) return 1;
    if (Number.isNaN(timeB)) return -1;

    return timeB - timeA;
  });

  return sortedRecords.map((record) => ({
    ...record,
    id: getIncidentId(record),
  }));
}

function Stat({ value, unit, label }) {
  return (
    <div className="flex items-center gap-5 rounded-xl border border-aqua px-6 py-5">
      <div className="text-center">
        <p className="text-3xl font-medium leading-none text-gray-900">
          {value}
        </p>

        {unit && <p className="mt-1 text-base text-gray-900">{unit}</p>}
      </div>

      <p className="text-base leading-snug text-gray-900">{label}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState({
    from: "",
    to: "",
  });
  const [rangeOpen, setRangeOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadReports() {
      setIsLoading(true);
      setLoadError("");
      setCurrentMonth(new Date());

      try {
        const fetchPromise = api.getReports();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Server took too long to respond.")), 5000)
        );

        const records = await Promise.race([fetchPromise, timeoutPromise]);

        if (!Array.isArray(records)) {
          throw new Error("The reports API returned an unexpected response.");
        }

        if (alive) setHistory(formatReportRecords(records));
      } catch (error) {
        if (alive) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load reports.",
          );
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    const timer = setTimeout(loadReports, 0);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [loadAttempt]);

  const hasRange = Boolean(range.from || range.to);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const from = range.from ? new Date(range.from).setHours(0, 0, 0, 0) : null;

    const to = range.to ? new Date(range.to).setHours(0, 0, 0, 0) : null;

    return history.filter((record) => {
      if (q && !Object.values(record).join(" ").toLowerCase().includes(q)) {
        return false;
      }

      if (from !== null || to !== null) {
        const day = dayOf(record);

        if (day === null) return false;
        if (from !== null && day < from) return false;
        if (to !== null && day > to) return false;
      }

      return true;
    });
  }, [history, query, range]);

  const stats = useMemo(() => {
    const rowsForStats = hasRange
      ? rows
      : currentMonth
        ? history.filter((row) => {
            const timestamp = Date.parse(row.date ?? row.when ?? "");

            if (Number.isNaN(timestamp)) return false;

            const date = new Date(timestamp);

            return (
              date.getFullYear() === currentMonth.getFullYear() &&
              date.getMonth() === currentMonth.getMonth()
            );
          })
        : [];

    const minutes = rowsForStats
      .map((row) => minutesOf(row.response))
      .filter((value) => value !== null);

    return {
      total: rowsForStats.length,

      resolved: rowsForStats.filter((row) => row.status === "Resolved").length,

      avgMinutes: minutes.length
        ? Math.round(
            minutes.reduce((sum, value) => sum + value, 0) / minutes.length,
          )
        : null,
    };
  }, [history, rows, hasRange, currentMonth]);

  const handleDownload = () => {
    downloadCsv(rows);
  };

  const dateInput =
    "mt-1 h-10 w-full rounded-lg border border-aqua/40 bg-mist px-3 text-sm outline-none focus:border-brand";

  return (
    <>
      <PageHeader
        title="Incident Reports & History"
        subtitle="Review past incidents and generate response report"
      />

      {loadError && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>Could not load reports: {loadError}</span>

          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-active"
          >
            Try again
          </button>
        </div>
      )}

      <div className="relative mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl text-gray-900">Reports</h2>

        <button
          type="button"
          aria-expanded={rangeOpen}
          aria-controls="reports-date-range"
          onClick={() => setRangeOpen((open) => !open)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-active sm:w-56"
        >
          Date range{hasRange ? " (on)" : ""}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>

        {rangeOpen && (
          <div
            id="reports-date-range"
            className="absolute left-0 right-0 top-full z-20 mt-2 w-full rounded-xl border border-aqua bg-white p-4 shadow-lg sm:left-auto sm:right-0 sm:w-72"
          >
            <label className="block text-sm font-semibold">
              From
              <input
                type="date"
                value={range.from}
                max={range.to || undefined}
                onChange={(event) =>
                  setRange({
                    ...range,
                    from: event.target.value,
                  })
                }
                className={dateInput}
              />
            </label>

            <label className="mt-3 block text-sm font-semibold">
              To
              <input
                type="date"
                value={range.to}
                min={range.from || undefined}
                onChange={(event) =>
                  setRange({
                    ...range,
                    to: event.target.value,
                  })
                }
                className={dateInput}
              />
            </label>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setRange({ from: "", to: "" })}
                className="h-10 flex-1 rounded-lg border border-brand text-sm font-semibold text-brand hover:bg-mist"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => setRangeOpen(false)}
                className="h-10 flex-1 rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-active"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <Stat
          value={isLoading || loadError ? "–" : stats.total}
          label={
            <>
              Total Incidents
              <br />
              {hasRange ? "In range" : "This month"}
            </>
          }
        />

        <Stat
          value={isLoading || loadError ? "–" : stats.resolved}
          label={
            <>
              Resolved Incidents
              <br />
              Response
            </>
          }
        />

        <Stat
          value={isLoading || loadError ? "–" : (stats.avgMinutes ?? "–")}
          unit={
            !isLoading && !loadError && stats.avgMinutes !== null
              ? "Min"
              : undefined
          }
          label={
            <>
              Average response
              <br />
              Time
            </>
          }
        />
      </div>

      <Panel>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Incident History
        </h2>

        <div className="relative mb-5">
          <Search
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand"
            aria-hidden="true"
          />

          <input
            aria-label="Search incidents"
            placeholder="Search by fisher, phone, incident ID or location"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-12 w-full rounded-lg border border-aqua/40 bg-mist pl-12 pr-4 text-sm outline-none placeholder:text-gray-400 focus:border-brand"
          />
        </div>

        <Suspense
          fallback={
            <div className="py-8 text-center text-gray-500">
              Loading incident records…
            </div>
          }
        >
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            empty={
              isLoading
                ? "Loading incident records…"
                : loadError
                  ? "Report records are unavailable."
                  : "No incidents found."
            }
            maxHeightClassName="max-h-26rem"
            tableClassName="min-w-[54rem]"
            headerCellPaddingClassName="px-5 py-4"
            cellPaddingClassName="px-5 py-4"
            emptyCellPaddingClassName="px-5 py-8"
          />
        </Suspense>
      </Panel>

      <button
        type="button"
        onClick={handleDownload}
        className="mt-5 self-start rounded-lg bg-brand px-8 py-3 text-sm font-semibold text-white hover:bg-brand-active"
      >
        Download Report
      </button>
    </>
  );
}
