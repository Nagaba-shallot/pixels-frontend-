"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import PageHeader from "@/components/PageHeader";
import { Panel } from "@/components/ui";
import { api } from "@/lib/api";

const DataTable = dynamic(() => import("@/components/ui/DataTable"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center text-gray-500">Loading table...</div>
  ),
});

const STATUS_TONE = {
  Available: "bg-green-100 text-green-700 border border-green-200",
  Unavailable: "bg-gray-100 text-gray-700 border border-gray-200",
  Unregistered: "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

function ToggleButton({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs transition-colors ${
        active
          ? "bg-[#008B8B] text-white font-medium"
          : "text-[#008B8B] hover:bg-[#008B8B]/10"
      }`}
    >
      <Image
        src={`/${icon}-${active ? "white" : "teal"}.svg`}
        alt=""
        width={16}
        height={16}
      />
      {children}
    </button>
  );
}

function WristbandsContent() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [registered, setRegistered] = useState([]);
  const [lastScanned, setLastScanned] = useState(null);

  const [highlightedTag, setHighlightedTag] = useState(null);
  const highlightTimeoutRef = useRef(null);

  const previousScannedRef = useRef(null);

  const [fishers, setFishers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const normalizeTag = (tag) =>
    String(tag || "")
      .trim()
      .toLowerCase();

  useEffect(() => {
    let alive = true;

    const loadData = async (showSpinner = false) => {
      if (showSpinner) setIsLoading(true);
      try {
        const [wristbandsResult, fishersResult, scanResult] =
          await Promise.allSettled([
            api.getAllWristbands(),
            api.getAllFishers(),
            api.getLastScan(),
          ]);

        if (!alive) return;

        let hasError = false;

        if (wristbandsResult.status === "fulfilled") {
          setRegistered(wristbandsResult.value);
        } else {
          hasError = true;
        }

        if (fishersResult.status === "fulfilled") {
          setFishers(fishersResult.value);
        } else {
          hasError = true;
        }

        if (scanResult.status === "rejected") {
          hasError = true;
        } else if (
          scanResult.status === "fulfilled" &&
          scanResult.value?.rfid_tag
        ) {
          const newTag = scanResult.value.rfid_tag;
          const newTimestamp = scanResult.value.timestamp;
          const scanSignature = newTimestamp
            ? `${newTag}-${newTimestamp}`
            : newTag;

          if (scanSignature !== previousScannedRef.current) {
            previousScannedRef.current = scanSignature;
            setLastScanned(newTag);
            setHighlightedTag(newTag);

            if (highlightTimeoutRef.current)
              clearTimeout(highlightTimeoutRef.current);

            highlightTimeoutRef.current = setTimeout(() => {
              if (alive) setHighlightedTag(null);
            }, 10000);
          }
        } else {
          setLastScanned(null);
        }

        if (hasError) {
          setLoadError(
            "Failed to load live data. Please check the IoT connection.",
          );
        } else {
          setLoadError("");
        }
      } catch {
        if (alive) setLoadError("Failed to load data.");
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    loadData(true);
    const interval = setInterval(() => loadData(false), 2000);

    return () => {
      alive = false;
      clearInterval(interval);
      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const fisherNamesById = useMemo(
    () =>
      new Map(fishers.map((fisher) => [fisher.fisher_id, fisher.full_name])),
    [fishers],
  );

  const wristbandRows = useMemo(() => {
    const dbRows = registered.map((wristband, index) => {
      const isAssigned = Boolean(wristband.fisher_id);

      const displayId = wristband.rfid_tag?.startsWith("WBD")
        ? wristband.rfid_tag
        : `WBD-${String(index + 1).padStart(3, "0")}`;

      const assignedFisherName = isAssigned
        ? (fisherNamesById.get(wristband.fisher_id) ?? "Unknown Fisher")
        : "—";

      return {
        ...wristband,
        display_id: displayId,
        rfid_tag: wristband.rfid_tag ?? "—",
        fisher_name: assignedFisherName,
        status: isAssigned ? "Unavailable" : "Available",
        isNew: false,
      };
    });

    const isAlreadyRegistered = registered.some(
      (w) => normalizeTag(w.rfid_tag) === normalizeTag(lastScanned),
    );

    if (lastScanned && !isAlreadyRegistered) {
      dbRows.unshift({
        id: "New Scan",
        wristband_id: null,
        display_id: "New Scan",
        rfid_tag: lastScanned,
        fisher_name: "—",
        status: "Unregistered",
        isNew: true,
      });
    }

    return dbRows;
  }, [registered, lastScanned, fisherNamesById]);

  const q = query.trim().toLowerCase();

  const allRows = useMemo(
    () =>
      wristbandRows.filter(
        (w) =>
          !q ||
          w.fisher_name.toLowerCase().includes(q) ||
          w.rfid_tag.toLowerCase().includes(q),
      ),
    [wristbandRows, q],
  );

  const sortedRows = useMemo(() => {
    if (!lastScanned) return allRows;

    return [...allRows].sort((a, b) => {
      const aIsScanned = normalizeTag(a.rfid_tag) === normalizeTag(lastScanned);
      const bIsScanned = normalizeTag(b.rfid_tag) === normalizeTag(lastScanned);
      if (aIsScanned && !bIsScanned) return -1;
      if (!aIsScanned && bIsScanned) return 1;
      return 0;
    });
  }, [allRows, lastScanned]);

  const finalData =
    tab === "all"
      ? sortedRows
      : sortedRows.filter((r) => r.status === "Unavailable");

  const handleRegister = async (rfid_tag) => {
    setIsRegistering(true);
    try {
      await api.createWristband(rfid_tag);
      setLastScanned(null);
    } catch (error) {
      setLoadError(error.message || "Failed to register wristband.");
    } finally {
      setIsRegistering(false);
    }
  };

  const allColumns = [
    { accessorKey: "display_id", header: "Wristband ID" },
    { accessorKey: "rfid_tag", header: "RFID Tag" },
    { accessorKey: "fisher_name", header: "Assigned Fisher" },
    {
      accessorKey: "status",
      header: "Status",
      meta: { center: true },
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center justify-center w-40 rounded-full py-1 text-xs font-semibold ${STATUS_TONE[row.original.status]}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "action",
      header: "Action",
      meta: { center: true },
      cell: ({ row }) => {
        const w = row.original;

        if (w.status === "Unregistered") {
          return (
            <button
              onClick={() => handleRegister(w.rfid_tag)}
              disabled={isRegistering}
              className="inline-block w-32 rounded-md py-1 text-center text-xs font-semibold bg-[#008B8B] text-white hover:bg-[#007373] shadow-sm transition-colors"
            >
              {isRegistering ? "Registering..." : "Register"}
            </button>
          );
        }

        if (w.status === "Available") {
          return (
            <button
              type="button"
              onClick={() => {
                router.push(
                  `/fishers?pair_wristband=${w.wristband_id}&rfid_tag=${w.rfid_tag}`,
                );
              }}
              className="inline-block w-32 rounded-md py-1 text-center text-xs font-semibold bg-[#008B8B]/10 text-[#008B8B] hover:bg-[#008B8B]/20 transition-colors"
            >
              Assign
            </button>
          );
        }

        if (w.status === "Unavailable") {
          return (
            <span className="inline-block w-32 text-center text-xs font-semibold text-gray-500">
              Paired
            </span>
          );
        }

        return null;
      },
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <PageHeader
        title="Wristbands"
        subtitle="Manage monitored wristbands and attached names of the Fishers."
      />

      <div className="mb-5 flex items-center justify-between flex-shrink-0">
        <div
          role="group"
          className="inline-flex w-fit items-center gap-1 rounded-full bg-teal-50 border border-teal-100 p-1"
        >
          <ToggleButton
            active={tab === "all"}
            onClick={() => setTab("all")}
            icon="watch-check"
          >
            All Wristbands
          </ToggleButton>
          <ToggleButton
            active={tab === "assigned"}
            onClick={() => setTab("assigned")}
            icon="watch-cross"
          >
            Assigned Wristbands
          </ToggleButton>
        </div>

        {lastScanned &&
          !registered.some(
            (w) => normalizeTag(w.rfid_tag) === normalizeTag(lastScanned),
          ) && (
            <button
              onClick={() => handleRegister(lastScanned)}
              disabled={isRegistering}
              className="rounded-full bg-[#008B8B] px-6 py-2 text-sm font-semibold text-white shadow hover:bg-[#007373]"
            >
              {isRegistering ? "Registering..." : "Register"}
            </button>
          )}
      </div>

      <Panel className="flex-1 flex flex-col min-h-0">
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
          <h2 className="min-w-0 text-xl font-semibold leading-snug text-[#008B8B] sm:text-2xl">
            {tab === "all" ? "Registered Wristbands" : "Assigned Wristbands"}
          </h2>

          {tab === "all" && (
            <div className="flex min-w-0 flex-wrap gap-2 text-sm text-[#008B8B] sm:gap-3 sm:text-base">
              <span className="max-w-full rounded-full bg-[#008B8B]/10 px-4 py-1.5 font-medium">
                Registered: {registered.length}
              </span>
              <span className="max-w-full rounded-full bg-[#008B8B]/10 px-4 py-1.5 font-medium">
                Assigned: {registered.filter((w) => w.fisher_id).length}
              </span>
            </div>
          )}
        </div>

        <div className="relative mb-5 flex-shrink-0">
          <Image
            src="/search.svg"
            alt=""
            width={20}
            height={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
          />
          <input
            aria-label="Search"
            placeholder="Search by fisher's name or RFID tag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm outline-none focus:border-[#008B8B] focus:ring-1 focus:ring-[#008B8B]"
          />
        </div>

        {loadError && (
          <p role="alert" className="mb-4 text-sm text-red-600 flex-shrink-0">
            {loadError}
          </p>
        )}

        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 overflow-auto">
            <DataTable
              columns={allColumns}
              data={finalData}
              getRowId={(w) => (w.isNew ? w.rfid_tag : w.wristband_id)}
              empty={
                isLoading ? "Loading wristbands..." : "No wristbands found."
              }
              maxHeightClassName="max-h-none"
              rowClassName={(w) =>
                normalizeTag(w.rfid_tag) === normalizeTag(highlightedTag)
                  ? "bg-green-200"
                  : ""
              }
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

export default function WristbandsPage() {
  return <WristbandsContent />;
}
