"use client";
import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./LakeMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-lg bg-sky-100" />
  ),
});

export default function LakeMap({
  className = "h-[28rem]",
  legend = false,
  children,
  ...props
}) {
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <div className="absolute inset-0">
        <Inner {...props} />
      </div>
      {legend && (
        <ul className="absolute bottom-4 left-4 z-[500] space-y-2 rounded-md bg-white p-3 text-sm shadow">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            Distressed Fisher
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-600" />
            Nearby Fishers
          </li>
        </ul>
      )}
      {children}
    </div>
  );
}
