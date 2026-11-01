"use client";

import { useEffect, useState, useRef } from "react";
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

const tableScrollClass =
  "flex-1 min-h-0 max-h-[60vh] overflow-y-auto rounded-lg [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-white";

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

export default function FishersPage() {
  const [panel, setPanel] = useState(null);
  const [fishers, setFishers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showToast, setShowToast] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
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

  async function loadFishers() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFishers();
      setFishers(data);
    } catch {
      setError(
        "We couldn't load the fishers right now. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFishers();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function openFisherDetails(fisher) {
    setDetailsLoading(true);
    setPanel({ details: fisher });

    try {
      const [alerts, trips, locations] = await Promise.all([
        api.getAlerts(),
        api.getTrips(),
        api.getLocations(),
      ]);

      const fisherAlerts = alerts.filter(
        (a) => a.fisher_id === fisher.fisher_id,
      );
      const fisherTrips = trips.filter((t) => t.fisher_id === fisher.fisher_id);

      const locationById = new Map(locations.map((l) => [l.location_id, l]));

      const respondersPerAlert = await Promise.all(
        fisherAlerts.map((alert) =>
          api.getAlertResponders(alert.alert_id).catch(() => []),
        ),
      );

      const enrichedAlerts = fisherAlerts.map((alert, i) => {
        const location = locationById.get(alert.location_id);
        const responders = respondersPerAlert[i] || [];

        let status = "Pending";
        if (alert.resolved_at) status = "Resolved";
        else if (alert.acknowledged_at) status = "Failed";

        let response_time = null;
        const arrivals = responders
          .map((r) => Date.parse(r.arrived_at))
          .filter((t) => Number.isFinite(t));
        if (arrivals.length) {
          const firstArrival = Math.min(...arrivals);
          const triggeredAt = Date.parse(alert.triggered_at);
          const minutes = Math.round((firstArrival - triggeredAt) / 60000);
          response_time = `${minutes} min`;
        }

        return {
          ...alert,
          status,
          response_time,
          location_name:
            location && Number.isFinite(location.latitude)
              ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : null,
        };
      });

      const enrichedTrips = fisherTrips.map((trip) => ({
        ...trip,
        status: trip.check_out_time ? "completed" : "active",
      }));

      setPanel({
        details: {
          ...fisher,
          sos_alerts: enrichedAlerts,
          trips: enrichedTrips,
        },
      });
    } catch (err) {
      console.error("Failed to load fisher details:", err);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleCreateFisher(payload) {
    try {
      const newFisher = await api.createFisher(payload);
      setFishers([newFisher, ...fishers]);
      setPanel(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Failed to create fisher:", err);
      alert("Failed to create fisher. Please check your connection.");
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

      const selectedDateString = selectedDate.toLocaleDateString("en-CA");

      const hasTripOnDate = (fisher.trips || []).some((trip) => {
        if (!trip.check_in_time) return false;
        const tripDate = new Date(trip.check_in_time).toLocaleDateString(
          "en-CA",
        );
        return tripDate === selectedDateString;
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
      render: (r) => (
        <button
          onClick={() => openFisherDetails(r)}
          className="text-brand font-semibold hover:underline"
        >
          View
        </button>
      ),
    },
  ];

  const todayColumns = [
    { key: "full_name", label: "Fisher name" },
    { key: "phone_number", label: "Phone number" },
    {
      key: "checked_in",
      label: "Checked-in",
      render: (r) => {
        if (!selectedDate) return "—";
        const selectedDateString = selectedDate.toLocaleDateString("en-CA");

        const matchingTrips = (r.trips || []).filter((t) => {
          if (!t.check_in_time) return false;
          const tripDate = new Date(t.check_in_time).toLocaleDateString(
            "en-CA",
          );
          return tripDate === selectedDateString;
        });

        if (matchingTrips.length === 0) return "—";

        return (
          <div className="flex flex-col gap-1">
            {matchingTrips.map((t, index) => (
              <span key={index}>
                {new Date(t.check_in_time).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "checked_out",
      label: "Checked-out",
      render: (r) => {
        if (!selectedDate) return "—";
        const selectedDateString = selectedDate.toLocaleDateString("en-CA");

        const matchingTrips = (r.trips || []).filter((t) => {
          if (!t.check_in_time) return false;
          const tripDate = new Date(t.check_in_time).toLocaleDateString(
            "en-CA",
          );
          return tripDate === selectedDateString;
        });

        if (matchingTrips.length === 0) return "—";

        return (
          <div className="flex flex-col gap-1">
            {matchingTrips.map((t, index) => (
              <span key={index}>
                {t.check_out_time
                  ? new Date(t.check_out_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <span className="font-semibold">Fisher created successfully!</span>
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

          <div className={tableScrollClass}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
                <p>Loading fishers...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{error}</p>
                <Button onClick={loadFishers} className="mt-4">
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

          <div className={tableScrollClass}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
                <p>Loading fishers...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{error}</p>
                <Button onClick={loadFishers} className="mt-4">
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
            isLoading={detailsLoading}
          />
        )}
      </Modal>
    </div>
  );
}
