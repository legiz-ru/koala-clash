import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useMemo, useState, useEffect, RefObject } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
  ColumnSizingState,
} from "@tanstack/react-table";
import { TableVirtuoso, TableComponents } from "react-virtuoso";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { truncateStr } from "@/utils/truncate-str";
import parseTraffic from "@/utils/parse-traffic";
import { t } from "i18next";
import { cn } from "@root/lib/utils";

dayjs.extend(relativeTime);

// Интерфейс для строки данных, которую использует react-table
interface ConnectionRow {
  id: string;
  host: string;
  download: number;
  upload: number;
  dlSpeed: number;
  ulSpeed: number;
  chains: string;
  rule: string;
  process: string;
  time: string;
  source: string;
  remoteDestination: string;
  type: string;
  connectionData: IConnectionsItem;
}

// Интерфейс для пропсов, которые компонент получает от родителя
interface Props {
  connections: IConnectionsItem[];
  onShowDetail: (data: IConnectionsItem) => void;
  scrollerRef: (element: HTMLElement | Window | null) => void;
}

export const ConnectionTable = (props: Props) => {
  const { connections, onShowDetail, scrollerRef } = props;

  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
    try {
      const saved = localStorage.getItem("connection-table-widths");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "connection-table-widths",
      JSON.stringify(columnSizing),
    );
  }, [columnSizing]);

  const connRows = useMemo((): ConnectionRow[] => {
    return connections.map((each) => {
      const { metadata, rulePayload } = each;
      const chains = [...each.chains].reverse().join(" / ");
      const rule = rulePayload ? `${each.rule}(${rulePayload})` : each.rule;
      const Destination = metadata.destinationIP
        ? `${metadata.destinationIP}:${metadata.destinationPort}`
        : `${metadata.remoteDestination}:${metadata.destinationPort}`;
      return {
        id: each.id,
        host: metadata.host
          ? `${metadata.host}:${metadata.destinationPort}`
          : `${metadata.remoteDestination}:${metadata.destinationPort}`,
        download: each.download,
        upload: each.upload,
        dlSpeed: each.curDownload ?? 0,
        ulSpeed: each.curUpload ?? 0,
        chains,
        rule,
        process: truncateStr(metadata.process || metadata.processPath) ?? "",
        time: each.start,
        source: `${metadata.sourceIP}:${metadata.sourcePort}`,
        remoteDestination: Destination,
        type: `${metadata.type}(${metadata.network})`,
        connectionData: each,
      };
    });
  }, [connections]);

  const columns = useMemo<ColumnDef<ConnectionRow>[]>(
    () => [
      {
        accessorKey: "host",
        header: () => t("Host"),
        size: columnSizing?.host || 220,
        minSize: 180,
      },
      {
        accessorKey: "download",
        header: () => t("Downloaded"),
        size: columnSizing?.download || 88,
        cell: ({ getValue }) => (
          <div className="text-right">
            {parseTraffic(getValue<number>()).join(" ")}
          </div>
        ),
      },
      {
        accessorKey: "upload",
        header: () => t("Uploaded"),
        size: columnSizing?.upload || 88,
        cell: ({ getValue }) => (
          <div className="text-right">
            {parseTraffic(getValue<number>()).join(" ")}
          </div>
        ),
      },
      {
        accessorKey: "dlSpeed",
        header: () => t("DL Speed"),
        size: columnSizing?.dlSpeed || 88,
        cell: ({ getValue }) => (
          <div className="text-right">
            {parseTraffic(getValue<number>()).join(" ")}/s
          </div>
        ),
      },
      {
        accessorKey: "ulSpeed",
        header: () => t("UL Speed"),
        size: columnSizing?.ulSpeed || 88,
        cell: ({ getValue }) => (
          <div className="text-right">
            {parseTraffic(getValue<number>()).join(" ")}/s
          </div>
        ),
      },
      {
        accessorKey: "chains",
        header: () => t("Chains"),
        size: columnSizing?.chains || 340,
        minSize: 180,
      },
      {
        accessorKey: "rule",
        header: () => t("Rule"),
        size: columnSizing?.rule || 280,
        minSize: 180,
      },
      {
        accessorKey: "process",
        header: () => t("Process"),
        size: columnSizing?.process || 220,
        minSize: 180,
      },
      {
        accessorKey: "time",
        header: () => t("Time"),
        size: columnSizing?.time || 120,
        minSize: 100,
        cell: ({ getValue }) => (
          <div className="text-right">
            {dayjs(getValue<string>()).fromNow()}
          </div>
        ),
      },
      {
        accessorKey: "source",
        header: () => t("Source"),
        size: columnSizing?.source || 200,
        minSize: 130,
      },
      {
        accessorKey: "remoteDestination",
        header: () => t("Destination"),
        size: columnSizing?.remoteDestination || 200,
        minSize: 130,
      },
      {
        accessorKey: "type",
        header: () => t("Type"),
        size: columnSizing?.type || 160,
        minSize: 100,
      },
    ],
    [columnSizing],
  );

  const table = useReactTable({
    data: connRows,
    columns,
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const VirtuosoTableComponents = useMemo<TableComponents<Row<ConnectionRow>>>(
    () => ({
      // Явно типизируем `ref` для каждого компонента
      Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
        <div className="h-full" {...props} ref={ref} />
      )),
      Table: (props) => <Table {...props} className="w-full border-collapse" />,
      TableHead: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
        <TableHeader {...props} ref={ref} />
      )),
      // Явно типизируем пропсы и `ref` для TableRow
      TableRow: React.forwardRef<
        HTMLTableRowElement,
        { item: Row<ConnectionRow> } & React.HTMLAttributes<HTMLTableRowElement>
      >(({ item: row, ...props }, ref) => {
        // `Virtuoso` передает нам готовую строку `row` в пропсе `item`.
        // Больше не нужно искать ее по индексу!
        return (
          <TableRow
            {...props}
            ref={ref}
            data-state={row.getIsSelected() && "selected"}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onShowDetail(row.original.connectionData)}
          />
        );
      }),
      TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
        <TableBody {...props} ref={ref} />
      )),
    }),
    [],
  );

  return (
    <div className="h-full rounded-md border overflow-hidden">
      {connRows.length > 0 ? (
        <TableVirtuoso
          scrollerRef={scrollerRef}
          data={table.getRowModel().rows}
          components={VirtuosoTableComponents}
          fixedHeaderContent={() =>
            table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent bg-background/95 backdrop-blur"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="p-2"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))
          }
          itemContent={(index, row) => (
            <>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                  className="p-2 whitespace-nowrap"
                  onClick={() => onShowDetail(row.original.connectionData)}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </>
          )}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <p>No results.</p>
        </div>
      )}
    </div>
  );
};
