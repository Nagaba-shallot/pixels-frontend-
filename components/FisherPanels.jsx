"use client";

import { useState } from "react";
import { Field, Button } from "@/components/ui";
import { ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import { normalizeTrip } from "@/lib/api";

export function CreateFisherForm({ onCreated }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.target);
    const f = Object.fromEntries(formData);

    try {
      const payload = {
        full_name: `${f.first} ${f.last}`,
        phone_number: f.phone,
        rfid_id: null,
      };
      await onCreated(payload);
    } catch (err) {
      setError(err.message || "Could not create fisher");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h2 className="text-xl font-semibold">Create Fisher</h2>
      <Field label="First name" name="first" required />
      <Field label="Last name" name="last" required />
      <Field label="Phone number" name="phone" type="tel" required />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Create a new fisher"}
      </Button>
    </form>
  );
}

export function FisherDetails({ details = {}, isLoading = false }) {
  const d = details;
  const [activeView, setActiveView] = useState("summary");

  const initial = d.full_name ? d.full_name.charAt(0).toUpperCase() : "F";

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const byNewest = (field) => (a, b) =>
    (Date.parse(b[field]) || 0) - (Date.parse(a[field]) || 0);
  const trips = (d.trips || [])
    .map(normalizeTrip)
    .sort(byNewest("check_in_time"));
  const sosAlerts = [...(d.sos_alerts || [])].sort(byNewest("created_at"));

  const latestTrip = trips.length > 0 ? trips[0] : {};
  const latestSOS = sosAlerts.length > 0 ? sosAlerts[0] : {};

  return (
    <div className="text-sm text-gray-800 h-full flex flex-col font-sans relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
          <p className="text-brand font-semibold">Loading history...</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 shrink-0">
        {activeView !== "summary" && (
          <button
            onClick={() => setActiveView("summary")}
            className="text-brand hover:bg-brand/10 p-1 rounded-md transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 className="text-[26px] font-normal text-brand tracking-wide">
          {activeView === "summary"
            ? "Fisher Details"
            : activeView === "trips"
              ? "Trip History"
              : "SOS History"}
        </h2>
      </div>

      {activeView === "summary" && (
        <>
          <div className="flex items-center gap-6 mb-8 px-2 shrink-0">
            <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#168b9e] text-[#00d2ff] text-[44px] font-normal">
              {initial}
            </div>

            <div>
              <h3 className="text-[26px] font-normal text-gray-900 tracking-tight">
                {d.full_name || "Unknown Fisher"}
              </h3>
              <p className="text-[18px] font-normal text-gray-500 mt-1">
                {d.phone_number || "No phone provided"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            <div className="rounded-xl border-2 border-[#00d2ff] p-6 flex flex-col h-full bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Image
                  src="/trips.svg"
                  alt="Trip History"
                  width={36}
                  height={36}
                  className="w-9 h-9"
                />
                <h4 className="text-[19px] font-bold text-brand tracking-wide">
                  Trip History
                </h4>
              </div>

              <div className="space-y-4 flex-grow">
                <div>
                  <p className="font-extrabold text-brand text-[14px] mb-1">
                    Date
                  </p>
                  <p className="font-normal text-gray-800 text-[16px]">
                    {formatDate(latestTrip.check_in_time)}
                  </p>
                </div>
                <div>
                  <p className="font-extrabold text-brand text-[14px] mb-1">
                    Total number of fishers in boat
                  </p>
                  <p className="font-normal text-gray-800 text-[16px]">
                    {latestTrip.fisher_count || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-extrabold text-brand text-[14px] mb-1">
                    Check-in Time
                  </p>
                  <p className="font-normal text-gray-800 text-[16px]">
                    {formatTime(latestTrip.check_in_time)}
                  </p>
                </div>
                <div>
                  <p className="font-extrabold text-brand text-[14px] mb-1">
                    Check-out Time
                  </p>
                  <p className="font-normal text-gray-800 text-[16px]">
                    {formatTime(latestTrip.check_out_time)}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setActiveView("trips")}
                className="w-full mt-6 bg-brand hover:bg-brand-active text-[16px] font-semibold py-3 rounded-lg"
              >
                View More
              </Button>
            </div>

            <div className="rounded-xl border-2 border-[#00d2ff] p-6 flex flex-col h-full bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Image
                  src="/sos.svg"
                  alt="SOS History"
                  width={36}
                  height={36}
                  className="w-9 h-9"
                />
                <h4 className="text-[19px] font-bold text-brand tracking-wide">
                  SOS History
                </h4>
              </div>

              <div className="space-y-4 flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-extrabold text-brand text-[14px] mb-1">
                      Date
                    </p>
                    <p className="font-normal text-gray-800 text-[16px]">
                      {formatDate(latestSOS.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-brand text-[14px] mb-1">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-[13px] font-semibold w-[130px] ${
                        latestSOS.status === "Resolved"
                          ? "bg-[#d1fae5] text-[#065f46]"
                          : latestSOS.status === "Failed"
                            ? "bg-[#fecaca] text-[#991b1b]"
                            : "bg-red-200 text-red-800"
                      }`}
                    >
                      {latestSOS.status || "—"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-extrabold text-brand text-[14px] mb-1">
                    Last Known Location
                  </p>
                  <p className="font-normal text-gray-800 text-[16px]">
                    {latestSOS.location_name || latestSOS.latitude || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-extrabold text-brand text-[14px] mb-1">
                    Response Time
                  </p>
                  <p className="font-normal text-gray-800 text-[16px]">
                    {latestSOS.response_time || "—"}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setActiveView("sos")}
                className="w-full mt-6 bg-brand hover:bg-brand-active text-[16px] font-semibold py-3 rounded-lg"
              >
                View More
              </Button>
            </div>
          </div>
        </>
      )}

      {activeView === "trips" && (
        <div className="flex-1 min-h-0 max-h-[60vh] overflow-y-auto border-2 border-[#00d2ff] rounded-xl px-4 pb-4">
          <table className="w-full mt-4 text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-brand text-white">
              <tr>
                <th className="px-4 py-3 font-normal rounded-tl-lg text-[15px]">
                  Trip Date
                </th>
                <th className="px-4 py-3 font-normal text-[15px]">
                  Checked-in
                </th>
                <th className="px-4 py-3 font-normal text-[15px]">
                  Checked-out
                </th>
                <th className="px-4 py-3 font-normal rounded-tr-lg text-[15px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No trip history available.
                  </td>
                </tr>
              ) : (
                trips.map((trip, index) => {
                  const isActive = !trip.check_out_time;

                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-300 last:border-none"
                    >
                      <td className="px-4 py-4 font-normal text-[15px]">
                        {formatDate(trip.check_in_time)}
                      </td>
                      <td className="px-4 py-4 font-normal text-[15px]">
                        {formatTime(trip.check_in_time)}
                      </td>
                      <td className="px-4 py-4 font-normal text-[15px]">
                        {formatTime(trip.check_out_time)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[13px] font-semibold ${
                            isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isActive ? "Active" : "Completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeView === "sos" && (
        <div className="flex-1 min-h-0 max-h-[60vh] overflow-y-auto border-2 border-[#00d2ff] rounded-xl px-4 pb-4">
          <table className="w-full mt-4 text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-brand text-white">
              <tr>
                <th className="px-4 py-3 font-normal rounded-tl-lg w-1/4 text-[15px]">
                  Date and Time
                </th>
                <th className="px-4 py-3 font-normal w-1/4 text-[15px]">
                  Last Known Location
                </th>
                <th className="px-4 py-3 font-normal w-1/4 text-[15px]">
                  Response Time
                </th>
                <th className="px-4 py-3 font-normal rounded-tr-lg w-1/4 text-[15px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sosAlerts.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No SOS history available.
                  </td>
                </tr>
              ) : (
                sosAlerts.map((sos, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-300 last:border-none"
                  >
                    <td className="px-4 py-4">
                      <div className="font-normal text-[15px]">
                        {formatDate(sos.created_at)}
                      </div>
                      <div className="font-normal text-gray-500 text-[13px] mt-0.5">
                        {formatTime(sos.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-normal text-[15px]">
                      {sos.location_name ||
                        `${sos.latitude || ""}, ${sos.longitude || ""}`}
                    </td>
                    <td className="px-4 py-4 font-normal text-[15px]">
                      {sos.response_time || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[13px] font-semibold w-[130px] ${
                          sos.status === "Resolved"
                            ? "bg-[#d1fae5] text-[#065f46]"
                            : sos.status === "Failed"
                              ? "bg-[#fecaca] text-[#991b1b]"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {sos.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
