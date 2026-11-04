"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

export default function DataTable({
  columns,
  data,
  getRowId,
  empty = "No results found.",
  className = "",
  maxHeightClassName = "max-h-128",
  tableClassName = "",
  headerCellPaddingClassName = "px-6 py-4",
  cellPaddingClassName = "px-6 py-4",
  emptyCellPaddingClassName = "px-6 py-8",
  rowClassName,
}) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const rows = table.getRowModel().rows;
  const columnCount = columns.length;

  return (
    <div className={`${maxHeightClassName} overflow-auto ${className}`}>
      <table className={`w-full text-sm ${tableClassName}`}>
        <thead className="sticky top-0 bg-brand text-white">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={`${headerCellPaddingClassName} text-base font-semibold ${
                    header.column.columnDef.meta?.center
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columnCount}
                className={`${emptyCellPaddingClassName} text-center text-gray-500`}
              >
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const customClass = rowClassName ? rowClassName(row.original) : "";
            const isHighlighted = customClass.includes("bg-green-");

            return (
              <tr
                key={row.id}
                className="border-b border-gray-500 transition-colors duration-300"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`${cellPaddingClassName} font-medium text-gray-900 ${
                      cell.column.columnDef.meta?.center
                        ? "text-center"
                        : "text-left"
                    } ${isHighlighted ? "bg-green-100" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
