"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { Panel } from "@/components/ui";
import DataTable from "@/components/ui/DataTable";
import useFocusTrap from "@/components/ui/useFocusTrap";
import { api } from "@/lib/api";

const STATUS_TONE = {
  Available: "bg-green-200/70 text-green-800",
  Unavailable: "bg-red-300 text-red-600",
};

function ToggleButton({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs transition-colors ${
        active
          ? "bg-brand text-white font-medium"
          : "text-brand hover:bg-brand/10"
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

function AssignModal({
  wristband,
  fishers,
  fishersError,
  assignmentError,
  isAssigning,
  returnFocusRef,
  onClose,
  onAssign,
}) {
  const [fisherId, setFisherId] = useState("");
  const dialogRef = useRef(null);
  const fisherSelectRef = useRef(null);

  useFocusTrap(dialogRef, {
    onClose,
    initialFocusRef: fisherSelectRef,
    returnFocusRef,
  });

  return (
    <div
      className="fixed inset-0 z-2000 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-title"
        className="w-full max-w-lg rounded-xl bg-white px-8 py-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="assign-title" className="text-xl font-bold text-brand">
            Assign Wristbands
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-brand"
          >
            <Image src="/close.svg" alt="" width={20} height={20} />
          </button>
        </div>

        <label htmlFor="select-fisher" className="mt-8 mb-3 block text-lg">
          Select Fisher
        </label>

        <div className="relative">
          <select
            ref={fisherSelectRef}
            id="select-fisher"
            value={fisherId}
            onChange={(e) => setFisherId(e.target.value)}
            disabled={isAssigning}
            className={`h-14 w-full appearance-none rounded-lg border border-aqua/40 bg-mist px-4 pr-12 text-sm outline-none focus:border-brand ${
              fisherId ? "text-gray-900" : "text-brand/60"
            }`}
          >
            <option value="">Choose Fisher</option>

            {fishers.map((fisher) => (
              <option key={fisher.fisher_id} value={fisher.fisher_id}>
                {fisher.full_name}
              </option>
            ))}
          </select>

          <Image
            src="/chevron-down-black.svg"
            alt=""
            width={20}
            height={20}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
          />
        </div>

        {fishersError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {fishersError}
          </p>
        )}

        <label htmlFor="wristband-id" className="mt-8 mb-3 block text-lg">
          Wristband
        </label>

        <input
          id="wristband-id"
          readOnly
          value={wristband.rfid_tag ?? wristband.id}
          className="h-14 w-full rounded-lg border border-aqua/40 bg-mist px-4 text-sm font-medium text-brand outline-none"
        />

        {assignmentError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {assignmentError}
          </p>
        )}

        <div className="mt-10 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-lg border border-brand bg-white text-sm font-semibold text-brand hover:bg-mist"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!fisherId || isAssigning}
            onClick={() => onAssign(fisherId)}
            className="h-12 flex-1 rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAssigning ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WristbandsPage() {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [registered, setRegistered] = useState([]);
  const [fishers, setFishers] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fishersError, setFishersError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");

  const returnFocusRef = useRef(null);
  const assignInFlightRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      const [wristbandsResult, fishersResult] = await Promise.allSettled([
        api.getAllWristbands(),
        api.getAllFishers(),
      ]);

      if (!alive) return;

      if (
        wristbandsResult.status === "fulfilled" &&
        Array.isArray(wristbandsResult.value)
      ) {
        setRegistered(wristbandsResult.value);
        setLoadError("");
      } else {
        setLoadError(
          wristbandsResult.status === "rejected"
            ? (wristbandsResult.reason?.message ?? "Unable to load wristbands.")
            : "The wristband response was not a list.",
        );
      }

      if (
        fishersResult.status === "fulfilled" &&
        Array.isArray(fishersResult.value)
      ) {
        setFishers(fishersResult.value);
        setFishersError("");
      } else {
        setFishersError(
          fishersResult.status === "rejected"
            ? (fishersResult.reason?.message ?? "Unable to load fishers.")
            : "The fisher response was not a list.",
        );
      }

      setIsLoading(false);
    };

    loadData();

    return () => {
      alive = false;
    };
  }, []);

  const fisherNamesById = useMemo(
    () =>
      new Map(fishers.map((fisher) => [fisher.fisher_id, fisher.full_name])),
    [fishers],
  );

  const wristbandRows = useMemo(
    () =>
      registered.map((wristband) => {
        const isAssigned = Boolean(wristband.fisher_id);

        return {
          ...wristband,
          id: wristband.rfid_tag ?? wristband.wristband_id,
          fisher: isAssigned
            ? (fisherNamesById.get(wristband.fisher_id) ?? "")
            : "",
          status: isAssigned ? "Unavailable" : "Available",
          checkIn: "—",
          checkOut: "—",
        };
      }),
    [registered, fisherNamesById],
  );

  const q = query.trim().toLowerCase();

  const assignedRows = wristbandRows.filter(
    (wristband) => wristband.status === "Unavailable",
  );

  const allRows = useMemo(
    () =>
      wristbandRows.filter(
        (w) =>
          !q ||
          w.fisher.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q),
      ),
    [wristbandRows, q],
  );

  const checkedOutRows = useMemo(
    () =>
      wristbandRows.filter(
        (w) =>
          w.status === "Unavailable" &&
          (!q || w.fisher.toLowerCase().includes(q)),
      ),
    [wristbandRows, q],
  );

  const assign = async (fisherId) => {
    if (!assigning || assignInFlightRef.current) return;

    assignInFlightRef.current = true;
    setIsAssigning(true);
    setAssignmentError("");

    try {
      const updatedWristband = await api.assignWristband(
        assigning.wristband_id,
        fisherId,
      );

      if (!updatedWristband?.wristband_id) {
        throw new Error("The wristband API returned an invalid response.");
      }

      setRegistered((rows) =>
        rows.map((wristband) =>
          wristband.wristband_id === updatedWristband.wristband_id
            ? updatedWristband
            : wristband,
        ),
      );

      setAssigning(null);
    } catch (error) {
      setAssignmentError(
        error instanceof Error ? error.message : "Unable to assign wristband.",
      );
    } finally {
      assignInFlightRef.current = false;
      setIsAssigning(false);
    }
  };

  const unassign = async (wristband) => {
    if (assignInFlightRef.current) return;

    assignInFlightRef.current = true;
    setAssignmentError("");

    try {
      const updatedWristband = await api.unassignWristband(
        wristband.wristband_id,
      );

      if (!updatedWristband?.wristband_id) {
        throw new Error("The wristband API returned an invalid response.");
      }

      setRegistered((rows) =>
        rows.map((w) =>
          w.wristband_id === updatedWristband.wristband_id
            ? updatedWristband
            : w,
        ),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to unassign wristband.",
      );
    } finally {
      assignInFlightRef.current = false;
    }
  };

  const allColumns = [
    {
      accessorKey: "id",
      header: "Wristband ID",
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { center: true },
      cell: ({ row }) => (
        <span
          className={`inline-block w-28 rounded-md py-1 text-center text-xs font-bold ${STATUS_TONE[row.original.status]}`}
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
        const isAssigned = Boolean(w.fisher_id);

        return (
          <button
            type="button"
            onClick={(event) => {
              returnFocusRef.current = event.currentTarget;
              setAssignmentError("");
              if (isAssigned) {
                unassign(w);
              } else {
                setAssigning(w);
              }
            }}
            className={`inline-block w-28 rounded-md py-1 text-center text-xs font-semibold ${
              isAssigned
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-aqua/25 text-sky-500 hover:bg-aqua/40"
            }`}
          >
            {isAssigned ? "Unassign" : "Assign"}
          </button>
        );
      },
    },
  ];

  const assignedColumns = [
    { accessorKey: "id", header: "Wristband ID" },
    { accessorKey: "fisher", header: "Fisher name" },
    { accessorKey: "checkIn", header: "Checked-in", meta: { center: true } },
    { accessorKey: "checkOut", header: "Checked-out", meta: { center: true } },
  ];

  const isAll = tab === "all";

  return (
    <>
      <PageHeader
        title="Wristbands"
        subtitle="Manage monitored wristband and attached names of the Fishers."
      />

      <div
        role="group"
        aria-label="Wristband views"
        className="mb-5 inline-flex w-fit items-center gap-1 rounded-full bg-aqua/15 p-1"
      >
        <ToggleButton
          active={isAll}
          onClick={() => setTab("all")}
          icon="watch-check"
        >
          All Wristbands
        </ToggleButton>

        <ToggleButton
          active={!isAll}
          onClick={() => setTab("checked-out")}
          icon="watch-cross"
        >
          Checked-Out Wristbands
        </ToggleButton>
      </div>

      <Panel className="flex-1">
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="min-w-0 text-xl font-semibold leading-snug text-brand sm:text-2xl">
            {isAll ? "Registered Wristbands" : "Assigned Wristbands"}
          </h2>

          {isAll && (
            <div className="flex min-w-0 flex-wrap gap-2 text-sm text-brand sm:gap-3 sm:text-base">
              <span className="max-w-full rounded-full bg-aqua/30 px-3 py-1.5 sm:px-5">
                Registered: {registered.length}
              </span>

              <span className="max-w-full rounded-full bg-aqua/30 px-3 py-1.5 sm:px-5">
                Assigned: {assignedRows.length}
              </span>
            </div>
          )}
        </div>

        <div className="relative mb-5">
          <Image
            src="/search.svg"
            alt=""
            width={20}
            height={20}
            className="absolute left-4 top-1/2 -translate-y-1/2"
          />

          <input
            aria-label="Search by fisher's name"
            placeholder="Search by fisher's name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-lg border border-aqua/40 bg-mist pl-12 pr-4 text-sm outline-none placeholder:text-gray-400 focus:border-brand"
          />
        </div>

        {loadError && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {loadError}
          </p>
        )}

        <Suspense fallback={null}>
          {isAll ? (
            <DataTable
              columns={allColumns}
              data={allRows}
              getRowId={(w) => w.wristband_id}
              empty={
                isLoading ? "Loading wristbands..." : "No wristbands found."
              }
            />
          ) : (
            <DataTable
              columns={assignedColumns}
              data={checkedOutRows}
              getRowId={(w) => w.wristband_id}
              empty={
                isLoading
                  ? "Loading wristbands..."
                  : "No assigned wristbands found."
              }
            />
          )}
        </Suspense>
      </Panel>

      {assigning && (
        <AssignModal
          wristband={assigning}
          fishers={fishers}
          fishersError={fishersError}
          assignmentError={assignmentError}
          isAssigning={isAssigning}
          returnFocusRef={returnFocusRef}
          onClose={() => {
            setAssignmentError("");
            setAssigning(null);
          }}
          onAssign={assign}
        />
      )}
    </>
  );
}
