"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { CreateFisherForm, FisherDetails } from "@/components/FisherPanels";
import { Button, Panel, DataTable, Modal } from "@/components/ui";
import { api } from "@/lib/api";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function getSafeDateString(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function FisherToggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 18px",
        fontSize: "11px",
        fontFamily: "inherit",
        color: active ? "#fff" : "#10353b",
        background: active ? "#17808d" : "none",
        border: 0,
        borderRadius: "999px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function FishersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pairWristbandId = searchParams.get("pair_wristband");
  const pairRfidTag = searchParams.get("rfid_tag");

  const [panel, setPanel] = useState(null);
  const [fishers, setFishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isPairing, setIsPairing] = useState(false);
  const headerDropdownRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedDate(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        headerDropdownRef.current &&
        !headerDropdownRef.current.contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayDate = selectedDate
    ? selectedDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Select Date";

  const loadFishers = useCallback(async () => {
    try {
      const data = await api.getAllFishers();
      setFishers(data);
      setError(null);
    } catch {
      setError("We couldn't load the fishers right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFishers();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadFishers]);

  useEffect(() => {
    if (filterType !== "today") return;

    const interval = setInterval(() => {
      loadFishers();
    }, 1000);

    return () => clearInterval(interval);
  }, [filterType, loadFishers]);

  async function handleCreateFisher(payload) {
    try {
      const newFisher = await api.createFisher(payload);
      setFishers([newFisher, ...fishers]);
      setPanel(null);
      setToastMsg("Fisher created successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch {
      alert("Failed to create fisher.");
    }
  }

  async function handlePairFisher(fisherId) {
    if (!pairWristbandId) return;
    setIsPairing(true);
    try {
      await api.assignWristband(pairWristbandId, fisherId);
      router.push("/wristbands");
    } catch (err) {
      alert("Failed to assign wristband: " + (err.message || "Unknown error"));
      setIsPairing(false);
    }
  }

  const filteredFishers = fishers.filter((fisher) => {
    const matchesSearch =
      (fisher.full_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (fisher.phone_number || "").includes(searchQuery) ||
      (fisher.rfid_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "today") {
      if (!selectedDate) return true;

      const selectedDateStr = getSafeDateString(selectedDate);

      const hasTripOnDate = (fisher.trips || []).some((trip) => {
        const checkInTime = trip.checkin_at || trip.check_in_time;
        if (!checkInTime) return false;

        const tripDateStr = getSafeDateString(checkInTime);
        return tripDateStr === selectedDateStr;
      });

      return hasTripOnDate;
    }
    return true;
  });

  const allColumns = [
    { key: "full_name", label: "Fisher name" },
    { key: "phone_number", label: "Phone number" },
    {
      key: "created_at",
      label: "Registration date",
      render: (r) => {
        if (!r.created_at) return "—";
        return new Date(r.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      },
    },
    {
      key: "action",
      label: "Action",
      render: (r) => {
        if (pairWristbandId) {
          const isCurrentlyPairedHere = r.rfid_id === pairRfidTag;

          return (
            <button
              onClick={() => handlePairFisher(r.fisher_id)}
              disabled={isPairing || isCurrentlyPairedHere}
              className={`rounded-md px-4 py-1 text-xs font-semibold text-white transition-colors ${
                isCurrentlyPairedHere
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#008B8B] hover:bg-[#007373]"
              }`}
            >
              {isPairing
                ? "Pairing..."
                : isCurrentlyPairedHere
                  ? "Paired Here"
                  : "Pair"}
            </button>
          );
        }

        if (r.rfid_id) {
          return (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPanel({ details: r })}
                className="text-[#008B8B] font-semibold hover:underline text-xs"
              >
                View
              </button>
              <span className="rounded-md bg-green-50 text-green-700 px-3 py-1 text-xs font-semibold border border-green-200">
                Checked In
              </span>
            </div>
          );
        }

        return (
          <button
            onClick={() => setPanel({ details: r })}
            className="text-[#008B8B] font-semibold hover:underline text-xs"
          >
            View
          </button>
        );
      },
    },
  ];

  const formatTime = (dateString) => {
    if (!dateString) return null;
    const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(dateString);
    const safeString = hasTimezone ? dateString : `${dateString}Z`;

    const dateObj = new Date(safeString);
    if (isNaN(dateObj.getTime())) return null;

    return dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const todayColumns = [
    {
      key: "full_name",
      label: "Fisher name",
      render: (r) => {
        const selectedDateStr = getSafeDateString(selectedDate);
        const activeTripsToday = (r.trips || []).filter((t) => {
          const checkIn = t.checkin_at || t.check_in_time;
          const checkOut = t.checkout_at || t.check_out_time;
          return (
            checkIn &&
            getSafeDateString(checkIn) === selectedDateStr &&
            !checkOut
          );
        });
        const isActive = activeTripsToday.length > 0;

        return (
          <div className="flex items-center gap-2">
            {isActive && (
              <span
                className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                title="Currently Checked In"
              />
            )}
            <span className={isActive ? "font-semibold text-gray-900" : ""}>
              {r.full_name}
            </span>
          </div>
        );
      },
    },
    { key: "phone_number", label: "Phone number" },
    {
      key: "checked_in",
      label: "Checked-in",
      render: (r) => {
        if (!selectedDate) return "—";
        const selectedDateStr = getSafeDateString(selectedDate);

        const matchingTrips = (r.trips || []).filter((t) => {
          const checkIn = t.checkin_at || t.check_in_time;
          if (!checkIn) return false;
          return getSafeDateString(checkIn) === selectedDateStr;
        });

        if (matchingTrips.length === 0) return "—";
        return (
          <div className="flex flex-col gap-1">
            {matchingTrips.map((t, index) => {
              const checkIn = t.checkin_at || t.check_in_time;
              const timeStr = formatTime(checkIn);
              return (
                <span
                  key={`in-${index}`}
                  className="font-medium text-[#008B8B]"
                >
                  {timeStr || "—"}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "checked_out",
      label: "Checked-out",
      render: (r) => {
        if (!selectedDate) return "—";
        const selectedDateStr = getSafeDateString(selectedDate);

        const matchingTrips = (r.trips || []).filter((t) => {
          const checkIn = t.checkin_at || t.check_in_time;
          if (!checkIn) return false;
          return getSafeDateString(checkIn) === selectedDateStr;
        });

        if (matchingTrips.length === 0) return "—";
        return (
          <div className="flex flex-col gap-1">
            {matchingTrips.map((t, index) => {
              const checkOut = t.checkout_at || t.check_out_time;
              const timeStr = checkOut ? formatTime(checkOut) : null;

              return (
                <span
                  key={`out-${index}`}
                  className={timeStr ? "text-gray-700" : "text-gray-400 italic"}
                >
                  {timeStr || "Currently in"}
                </span>
              );
            })}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col min-h-full relative">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-800 font-medium mb-4 hover:text-brand transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold text-brand mb-2">Fishers</h1>
        <p className="text-gray-500 text-lg">
          Manage registered fishers and monitor their wristband status.
        </p>
      </div>

      {pairWristbandId && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg bg-[#FFF9E6] p-5 border-2 border-[#F5C242] shadow-sm">
          <div>
            <h3 className="text-[#B37B00] font-bold text-lg flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-[#F5C242] animate-pulse"></span>
              Pairing Mode Active
            </h3>
            <p className="text-[#B37B00] text-sm mt-1">
              Select a fisher below to pair them with the scanned wristband:
              <strong className="ml-2 px-3 py-1 bg-white border border-[#F5C242] rounded-md text-[#10353b] shadow-sm font-mono text-base tracking-wider inline-block">
                {pairRfidTag || pairWristbandId}
              </strong>
            </p>
          </div>
          <button
            onClick={() => router.push("/wristbands")}
            className="text-sm font-bold text-[#B37B00] hover:underline bg-[#FFF9E6] border border-[#F5C242] px-4 py-2 rounded-md hover:bg-[#FFF3CC] transition-colors self-start sm:self-center"
          >
            Cancel Pairing
          </button>
        </div>
      )}

      <div className="mb-6">
        <div
          style={{
            display: "inline-flex",
            background: "#e3f4f7",
            borderRadius: "999px",
            padding: "4px",
          }}
        >
          <FisherToggle
            active={filterType === "all"}
            onClick={() => setFilterType("all")}
          >
            <Image
              src="/users-white.svg"
              alt=""
              width={14}
              height={14}
              className={filterType === "all" ? "block" : "hidden"}
            />
            <Image
              src="/users-teal.svg"
              alt=""
              width={14}
              height={14}
              className={filterType === "all" ? "hidden" : "block"}
            />
            All Fishers
          </FisherToggle>

          <FisherToggle
            active={filterType === "today"}
            onClick={() => setFilterType("today")}
          >
            <Image
              src="/watch-check-white.svg"
              alt=""
              width={14}
              height={14}
              className={filterType === "today" ? "block" : "hidden"}
            />
            <Image
              src="/watch-check-teal.svg"
              alt=""
              width={14}
              height={14}
              className={filterType === "today" ? "hidden" : "block"}
            />
            Today&apos;s Wristband Users
          </FisherToggle>
        </div>
      </div>

      {filterType === "today" ? (
        <Panel className="border-brand/50 border-2 rounded-xl p-4 md:p-8 flex-1 flex flex-col bg-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-medium text-brand">
              Today&apos;s Wristband User&apos;s
            </h2>

            <div
              className="relative self-end md:self-auto"
              ref={headerDropdownRef}
            >
              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  setOpenDropdown(null);
                }}
                dateFormat="dd MMMM, yyyy"
                popperPlacement="bottom-end"
                maxDate={new Date()}
                renderCustomHeader={({
                  date,
                  changeYear,
                  changeMonth,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                }) => {
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];
                  const years = Array.from(
                    { length: 15 },
                    (_, i) => new Date().getFullYear() - i,
                  );

                  return (
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 rounded-t-lg w-[280px]">
                      <button
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        className="p-1 text-gray-500 hover:text-brand disabled:opacity-30 transition-colors"
                        type="button"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="flex items-center justify-center gap-1">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === "month" ? null : "month",
                              )
                            }
                            className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-brand px-2 py-1 rounded"
                          >
                            {months[date.getMonth()]}
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {openDropdown === "month" && (
                            <div className="absolute top-full left-0 mt-1 w-32 max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-md z-[100] py-1">
                              {months.map((month, index) => (
                                <button
                                  key={month}
                                  type="button"
                                  onClick={() => {
                                    changeMonth(index);
                                    setOpenDropdown(null);
                                  }}
                                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${date.getMonth() === index ? "text-brand font-bold" : "text-gray-700"}`}
                                >
                                  {month}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === "year" ? null : "year",
                              )
                            }
                            className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-brand px-2 py-1 rounded"
                          >
                            {date.getFullYear()}
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {openDropdown === "year" && (
                            <div className="absolute top-full right-0 mt-1 w-24 max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-md z-[100] py-1">
                              {years.map((year) => (
                                <button
                                  key={year}
                                  type="button"
                                  onClick={() => {
                                    changeYear(year);
                                    setOpenDropdown(null);
                                  }}
                                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${date.getFullYear() === year ? "text-brand font-bold" : "text-gray-700"}`}
                                >
                                  {year}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        className="p-1 text-gray-500 hover:text-brand disabled:opacity-30 transition-colors"
                        type="button"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }}
                customInput={
                  <button className="flex items-center justify-center gap-2 md:gap-4 px-4 py-2 md:px-6 md:py-3 border border-brand rounded-lg text-brand text-sm md:text-xl font-medium hover:bg-brand/5 transition-colors">
                    <Image
                      src="/calendar.svg"
                      alt="Calendar"
                      width={24}
                      height={24}
                      className="w-5 h-5 md:w-6 md:h-6"
                      style={{ width: "auto", height: "auto" }}
                    />
                    <span className="whitespace-nowrap">{displayDate}</span>
                    <ChevronDown className="w-4 h-4 md:w-6 md:h-6 ml-1 md:ml-2" />
                  </button>
                }
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
                <p>Loading fishers...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{error}</p>
                <Button
                  onClick={() => {
                    setLoading(true);
                    loadFishers();
                  }}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <DataTable
                columns={todayColumns}
                rows={filteredFishers}
                getKey={(r, i) => r.fisher_id || r.id || i}
                empty={"No wristband users checked in on this date."}
              />
            )}
          </div>
        </Panel>
      ) : (
        <Panel className="flex-1 flex flex-col">
          <div className="mb-4 flex gap-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
              <input
                aria-label="Search fishers"
                placeholder="Search by name, phone or wristband"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-aqua/40 bg-mist pl-10 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
            <Button onClick={() => setPanel("create")} className="w-56">
              + Add Fisher
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
                <p>Loading fishers...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{error}</p>
                <Button
                  onClick={() => {
                    setLoading(true);
                    loadFishers();
                  }}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <DataTable
                columns={allColumns}
                rows={filteredFishers}
                getKey={(r) => r.fisher_id || r.id}
                empty={"No fishers found matching your criteria."}
              />
            )}
          </div>
        </Panel>
      )}

      <Modal open={!!panel} onClose={() => setPanel(null)} label="Fisher">
        {panel === "create" ? (
          <CreateFisherForm onCreated={handleCreateFisher} />
        ) : (
          <FisherDetails
            details={panel?.details}
            onClose={() => setPanel(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export default function FishersPage() {
  return (
    <Suspense fallback={null}>
      <FishersContent />
    </Suspense>
  );
}
