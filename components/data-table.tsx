"use client";

import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  EllipsisIcon,
} from "lucide-react";
import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/client";

export type DataTableColumn = {
  key: string;
  header: string;
  isStatus?: boolean;
  // Row field to sort by when the displayed text doesn't sort naturally.
  sortKey?: string;
};

export type DataTableRow = Record<string, string>;

export type DataTableTab = {
  value: string;
  label: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  cellContent?: Record<string, Record<string, React.ReactNode>>;
};

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, alphanumeric: sortFn_alphanumeric },
});

const columnHelper = createColumnHelper<typeof features, DataTableRow>();

const pageSizes = [10, 20, 30, 40, 50];

export function ResourceTable({
  tab,
  viewSelector,
}: {
  tab: DataTableTab;
  viewSelector?: React.ReactNode;
}) {
  const { t } = useI18n();
  const labels = t.dashboard.table;
  const [query, setQuery] = React.useState("");
  const searchId = React.useId();
  const filteredRows = React.useMemo(
    () =>
      tab.rows.filter((row) =>
        Object.entries(row).some(
          ([key, value]) =>
            key !== "_id" &&
            value.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        ),
      ),
    [tab.rows, query],
  );
  const columns = React.useMemo(
    () =>
      columnHelper.columns(
        tab.columns.map(({ key, header, isStatus, sortKey }) =>
          columnHelper.accessor((row) => row[sortKey ?? key], {
            id: key,
            enableSorting: key !== "actions",
            header: ({ column }) =>
              key === "actions" ? (
                <span className="sr-only">{t.common.actions}</span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2.5"
                  onClick={() => column.toggleSorting()}
                >
                  {header}
                  <ArrowUpDownIcon data-icon="inline-end" />
                </Button>
              ),
            cell: ({ row }) =>
              key === "actions" ? (
                tab.cellContent?.[row.original._id]?.[key] ? (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t.common.actions}
                        />
                      }
                    >
                      <EllipsisIcon />
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56 gap-0 p-1">
                      <PopoverTitle className="px-2.5 py-1.5">
                        {t.common.actions}
                      </PopoverTitle>
                      <Separator className="my-1" />
                      {tab.cellContent[row.original._id][key]}
                    </PopoverContent>
                  </Popover>
                ) : null
              ) : (
                (tab.cellContent?.[row.original._id]?.[key] ??
                (isStatus ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    {row.original[key]}
                  </Badge>
                ) : (
                  row.original[key]
                )))
              ),
          }),
        ),
      ),
    [tab.columns, tab.cellContent, t.common.actions],
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useTable({
    features,
    data: filteredRows,
    columns,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Field className="min-w-0 max-w-sm flex-1">
          <FieldLabel className="sr-only" htmlFor={searchId}>
            {t.common.search}
          </FieldLabel>
          <Input
            id={searchId}
            placeholder={`${t.common.search}…`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          />
        </Field>
        <div className="flex shrink-0 items-center gap-3">
          {viewSelector}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Columns3Icon data-icon="inline-start" />
              {labels.columns}
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                {tab.columns.map(({ key, header }) => {
                  const column = table.getColumn(key);

                  return (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={column?.getIsVisible()}
                      onCheckedChange={(value) =>
                        column?.toggleVisibility(value)
                      }
                    >
                      {header}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    <FlexRender header={header} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) =>
                  cell.column.getIsVisible() ? (
                    <TableCell key={cell.id}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ) : null,
                )}
              </TableRow>
            ))}
            {!filteredRows.length && (
              <TableRow>
                <TableCell
                  colSpan={tab.columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {labels.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-8">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor={`${tab.value}-rows`} className="text-sm font-medium">
            {labels.rowsPerPage}
          </Label>
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
            items={pageSizes.map((pageSize) => ({
              label: `${pageSize}`,
              value: `${pageSize}`,
            }))}
          >
            <SelectTrigger size="sm" className="w-20" id={`${tab.value}-rows`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {pageSizes.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm font-medium">
          {labels.pageOf(
            pagination.pageIndex + 1,
            Math.max(1, table.getPageCount()),
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            aria-label={labels.firstPage}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={labels.previousPage}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={labels.nextPage}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            aria-label={labels.lastPage}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DataTable({ tabs }: { tabs: DataTableTab[] }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.value);

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full flex-col justify-start gap-6"
    >
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <Card>
            <CardContent>
              <ResourceTable
                tab={tab}
                viewSelector={
                  <div className="min-w-0">
                    <Label htmlFor="view-selector" className="sr-only">
                      {t.dashboard.table.view}
                    </Label>
                    <Select
                      value={activeTab}
                      onValueChange={(value) => value && setActiveTab(value)}
                      items={tabs.map(({ value, label }) => ({ value, label }))}
                    >
                      <SelectTrigger
                        className="flex w-fit @4xl/main:hidden"
                        size="sm"
                        id="view-selector"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {tabs.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <TabsList className="hidden @4xl/main:flex">
                      {tabs.map(({ value, label }) => (
                        <TabsTrigger key={value} value={value}>
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
