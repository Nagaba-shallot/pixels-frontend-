export default function IncidentPanel({ incident = {}, onClose }) {
  const v = (x) => x ?? "—";
  return (
    <aside
      aria-label="Incident details"
      className="absolute left-4 top-4 z-[500] w-72 rounded-lg bg-white p-4 text-xs shadow-lg"
    >
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close incident details"
          className="absolute right-3 top-3 rounded p-1 hover:bg-gray-100"
        >
          ✕
        </button>
      )}
      <h2 className="mb-2 text-sm font-semibold">Incident Details</h2>
      <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5">
        <dt>Fisher</dt>
        <dd className="font-semibold">{v(incident.fisher)}</dd>
        <dt>No. of fishers</dt>
        <dd>{v(incident.fishers)}</dd>
        <dt>Location</dt>
        <dd>{v(incident.location)}</dd>
        <dt>Time</dt>
        <dd>{v(incident.time)}</dd>
        <dt>Status</dt>
        <dd>
          {incident.status ? (
            <span className="rounded-full bg-red-200 px-3 py-0.5 font-semibold text-red-700">
              {incident.status}
            </span>
          ) : (
            "—"
          )}
        </dd>
      </dl>
      <h3 className="mb-2 mt-4 border-t pt-3 text-sm font-semibold">
        Response Timeline
      </h3>
      <ol className="space-y-1.5">
        {(incident.timeline ?? []).map((t, i) => (
          <li key={i} className="grid grid-cols-[4rem_1fr] gap-2">
            <time className="text-gray-500">{t.time}</time>
            <span>{t.text}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
