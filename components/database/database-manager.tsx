"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Service } from "@/types/service";
import {
  getDatabaseOverviewApi,
  getTableDataApi,
  insertTableRowApi,
  updateTableRowApi,
  deleteTableRowApi,
  createTableApi,
  dropTableApi,
  DatabaseOverview,
  TableDataResponse,
  TableColumnDef,
} from "@/lib/api/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { LanguageLogo } from "@/components/ui/language-logo";
import { useToast } from "@/lib/toast/toast-context";
import {
  Table,
  Search,
  Plus,
  RotateCw,
  Copy,
  Check,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileJson,
  KeyRound,
} from "lucide-react";

interface DatabaseManagerProps {
  service: Service;
  projectId: string;
}

export function DatabaseManager({ service, projectId }: DatabaseManagerProps) {
  const notify = useToast();
  const toast = useMemo(
    () => ({
      show: ({
        type,
        title,
        description,
      }: {
        type?: "success" | "error" | "warning" | "info";
        title: string;
        description?: string;
      }) => {
        if (type === "success") notify.success(title, { message: description });
        else if (type === "error") notify.error(title, { message: description });
        else if (type === "warning") notify.warning(title, { message: description });
        else notify.info(title, { message: description });
      },
    }),
    [notify]
  );

  const [overview, setOverview] = useState<DatabaseOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Explorer State
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableSearch, setTableSearch] = useState("");
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [activeTableView, setActiveTableView] = useState<"data" | "schema">("data");

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);
  const [addRowMode, setAddRowMode] = useState<"form" | "json">("form");
  const [rowFormData, setRowFormData] = useState<Record<string, any>>({});
  const [newRowData, setNewRowData] = useState<string>("{}");
  const [isSubmittingRow, setIsSubmittingRow] = useState(false);

  const [isEditRowOpen, setIsEditRowOpen] = useState(false);
  const [editRowMode, setEditRowMode] = useState<"form" | "json">("form");
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editRowData, setEditRowData] = useState<string>("{}");

  const [isDeleteRowOpen, setIsDeleteRowOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<Record<string, any> | null>(null);

  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [redisInitialValue, setRedisInitialValue] = useState("");
  const [redisInitialTTL, setRedisInitialTTL] = useState("");
  const [newTableCols, setNewTableCols] = useState<
    { name: string; type: string; is_primary_key: boolean; is_nullable: boolean }[]
  >([
    { name: "id", type: "SERIAL", is_primary_key: true, is_nullable: false },
    { name: "name", type: "VARCHAR(255)", is_primary_key: false, is_nullable: false },
    { name: "created_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", is_primary_key: false, is_nullable: true },
  ]);

  const addColumnRow = () => {
    setNewTableCols((prev) => [
      ...prev,
      { name: `col_${prev.length + 1}`, type: "VARCHAR(255)", is_primary_key: false, is_nullable: true },
    ]);
  };

  const removeColumnRow = (index: number) => {
    if (newTableCols.length <= 1) {
      toast.show({ type: "warning", title: "Table must have at least one column" });
      return;
    }
    setNewTableCols((prev) => prev.filter((_, i) => i !== index));
  };

  const updateColumnRow = (index: number, field: string, value: any) => {
    setNewTableCols((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        if (field === "is_primary_key" && value === true) {
          return { ...c, is_primary_key: true, is_nullable: false };
        }
        return { ...c, [field]: value };
      })
    );
  };

  const [isDropTableOpen, setIsDropTableOpen] = useState(false);
  const [droppingTable, setDroppingTable] = useState("");

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.show({
      type: "success",
      title: "Copied to clipboard",
      description: text.length > 60 ? `${text.slice(0, 60)}...` : text,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch Overview
  const fetchOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const data = await getDatabaseOverviewApi(service.id);
      if (data) {
        setOverview(data);
        if (data.tables && Array.isArray(data.tables) && data.tables.length > 0) {
          if (!selectedTable || !data.tables.some((t) => t.name === selectedTable)) {
            setSelectedTable(data.tables[0].name);
          }
        }
      }
    } catch (err: any) {
      toast.show({
        type: "error",
        title: "Failed to load database overview",
        description: err.message || "Could not connect to engine",
      });
    } finally {
      setIsLoadingOverview(false);
    }
  }, [service.id, selectedTable, toast]);

  // Fetch Table Data
  const fetchTableData = useCallback(
    async (table: string, p = 1, l = 50) => {
      if (!table) return;
      setIsLoadingTableData(true);
      try {
        const data = await getTableDataApi(service.id, table, p, l);
        setTableData(data);
      } catch (err: any) {
        toast.show({
          type: "error",
          title: `Failed to load table ${table}`,
          description: err.message || "Query failed",
        });
      } finally {
        setIsLoadingTableData(false);
      }
    },
    [service.id, toast]
  );

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      fetchTableData(selectedTable, 1, limit);
    } else {
      setTableData(null);
    }
  }, [selectedTable, limit, fetchTableData]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    if (!overview?.tables) return [];
    if (!tableSearch.trim()) return overview.tables;
    return overview.tables.filter((t) =>
      t.name.toLowerCase().includes(tableSearch.toLowerCase().trim())
    );
  }, [overview?.tables, tableSearch]);

  const isMongo = overview?.db_type === "mongodb";
  const isRedis = overview?.db_type === "redis";
  const isSQL = !isMongo && !isRedis;

  // Build payload for Insert Row
  const buildInsertPayload = () => {
    if (addRowMode === "json") {
      try {
        return JSON.parse(newRowData);
      } catch {
        throw new Error("Invalid JSON format in raw editor");
      }
    }

    const payload: Record<string, any> = {};
    for (const [col, val] of Object.entries(rowFormData)) {
      const colSchema = tableData?.schema?.find((s) => s.name === col);
      const isAuto =
        col === "id" ||
        col === "_id" ||
        col === "created_at" ||
        col === "updated_at" ||
        colSchema?.default?.toLowerCase().includes("nextval") ||
        colSchema?.default?.toLowerCase().includes("now") ||
        colSchema?.type?.toLowerCase().includes("serial");

      // Auto-generated fields left empty should be omitted so DB default applies
      if (isAuto && (val === "" || val === undefined || val === null)) {
        continue;
      }

      if (val === "" || val === undefined) {
        if (colSchema?.nullable) {
          payload[col] = null;
        } else if (isAuto) {
          continue;
        } else {
          payload[col] = "";
        }
        continue;
      }

      const colType = colSchema?.type?.toLowerCase() || "";
      if (
        colType.includes("int") ||
        colType.includes("serial") ||
        colType.includes("numeric") ||
        colType.includes("decimal") ||
        colType.includes("float")
      ) {
        const num = Number(val);
        payload[col] = isNaN(num) ? val : num;
      } else if (colType.includes("bool")) {
        payload[col] = val === true || val === "true";
      } else {
        payload[col] = val;
      }
    }
    return payload;
  };

  // Build payload for Edit Row
  const buildEditPayload = () => {
    if (editRowMode === "json") {
      try {
        return JSON.parse(editRowData);
      } catch {
        throw new Error("Invalid JSON format in raw editor");
      }
    }

    const payload: Record<string, any> = {};
    for (const [col, val] of Object.entries(editFormData)) {
      const colSchema = tableData?.schema?.find((s) => s.name === col);

      if (val === "" || val === undefined) {
        if (colSchema?.nullable) {
          payload[col] = null;
        } else {
          payload[col] = "";
        }
        continue;
      }

      const colType = colSchema?.type?.toLowerCase() || "";
      if (
        colType.includes("int") ||
        colType.includes("serial") ||
        colType.includes("numeric") ||
        colType.includes("decimal") ||
        colType.includes("float")
      ) {
        const num = Number(val);
        payload[col] = isNaN(num) ? val : num;
      } else if (colType.includes("bool")) {
        payload[col] = val === true || val === "true";
      } else {
        payload[col] = val;
      }
    }
    return payload;
  };

  // Insert Row Action
  const handleInsertRow = async () => {
    setIsSubmittingRow(true);
    try {
      const payload = buildInsertPayload();
      if (Object.keys(payload).length === 0) {
        throw new Error("Please provide at least one column value to insert");
      }

      const res = await insertTableRowApi(service.id, selectedTable, payload);
      if (res.success) {
        toast.show({
          type: "success",
          title: "Record inserted",
          description: `Successfully added to ${selectedTable}`,
        });
        setIsAddRowOpen(false);
        fetchTableData(selectedTable, page, limit);
        fetchOverview();
      } else {
        throw new Error(res.error || "Failed to insert");
      }
    } catch (err: any) {
      toast.show({
        type: "error",
        title: "Failed to insert record",
        description: err.message,
      });
    } finally {
      setIsSubmittingRow(false);
    }
  };

  // Update Row Action
  const handleUpdateRow = async () => {
    if (!editingRow) return;
    setIsSubmittingRow(true);
    try {
      const payload = buildEditPayload();

      // Find primary key
      const pkCol =
        tableData?.schema?.find((s) => s.name === "id" || s.name.endsWith("_id"))?.name ||
        (isMongo ? "_id" : Object.keys(editingRow)[0]);
      const pkVal = editingRow[pkCol];

      const res = await updateTableRowApi(service.id, selectedTable, pkCol, pkVal, payload);
      if (res.success) {
        toast.show({
          type: "success",
          title: "Record updated",
          description: `Updated record in ${selectedTable}`,
        });
        setIsEditRowOpen(false);
        setEditingRow(null);
        fetchTableData(selectedTable, page, limit);
      } else {
        throw new Error(res.error || "Failed to update");
      }
    } catch (err: any) {
      toast.show({
        type: "error",
        title: "Failed to update record",
        description: err.message,
      });
    } finally {
      setIsSubmittingRow(false);
    }
  };

  // Delete Row Action
  const handleDeleteRow = async () => {
    if (!deletingRow) return;
    try {
      const pkCol =
        tableData?.schema?.find((s) => s.name === "id" || s.name.endsWith("_id"))?.name ||
        (isMongo ? "_id" : Object.keys(deletingRow)[0]);
      const pkVal = deletingRow[pkCol];

      const res = await deleteTableRowApi(service.id, selectedTable, pkCol, pkVal);
      if (res.success) {
        toast.show({
          type: "success",
          title: "Record deleted",
          description: `Deleted from ${selectedTable}`,
        });
        setIsDeleteRowOpen(false);
        setDeletingRow(null);
        fetchTableData(selectedTable, page, limit);
        fetchOverview();
      } else {
        throw new Error(res.error || "Failed to delete");
      }
    } catch (err: any) {
      toast.show({
        type: "error",
        title: "Failed to delete record",
        description: err.message,
      });
    }
  };

  // SQL live preview for table creation
  const sqlPreview = useMemo(() => {
    if (isMongo || !newTableName.trim()) return "";
    const defs = newTableCols
      .filter((c) => c.name.trim().length > 0)
      .map((c) => {
        let s = `${c.name.trim()} ${c.type}`;
        if (c.is_primary_key) s += " PRIMARY KEY";
        else if (!c.is_nullable) s += " NOT NULL";
        return s;
      });
    return `CREATE TABLE ${newTableName.trim()} (\n  ${defs.join(",\n  ")}\n);`;
  }, [isMongo, newTableName, newTableCols]);

  // Create Table / Key Action
  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      toast.show({
        type: "error",
        title: isRedis ? "Key name is required" : "Table name is required",
      });
      return;
    }
    const safeCols = newTableCols.filter((c) => c.name.trim().length > 0);
    if (isSQL && safeCols.length === 0) {
      toast.show({ type: "error", title: "At least one column is required" });
      return;
    }
    try {
      let colsToSend: TableColumnDef[] = isMongo ? [] : safeCols;
      if (isRedis) {
        colsToSend = [
          {
            name: redisInitialValue || "value",
            type: redisInitialTTL || "-1",
          },
        ];
      }
      const res = await createTableApi(
        service.id,
        newTableName.trim(),
        colsToSend
      );
      if (res.success) {
        toast.show({
          type: "success",
          title: isRedis ? "Key created" : isMongo ? "Collection created" : "Table created",
          description: `${newTableName.trim()} is ready`,
        });
        setIsCreateTableOpen(false);
        setNewTableName("");
        setRedisInitialValue("");
        setRedisInitialTTL("");
        setNewTableCols([
          { name: "id", type: "SERIAL", is_primary_key: true, is_nullable: false },
          { name: "name", type: "VARCHAR(255)", is_primary_key: false, is_nullable: false },
          { name: "created_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", is_primary_key: false, is_nullable: true },
        ]);
        fetchOverview();
        setSelectedTable(newTableName.trim());
      } else {
        throw new Error(res.error || "Failed to create");
      }
    } catch (err: any) {
      toast.show({
        type: "error",
        title: isRedis ? "Error creating key" : "Error creating table",
        description: err.message,
      });
    }
  };

  // Drop Table Action
  const handleDropTable = async () => {
    if (!droppingTable) return;
    try {
      const res = await dropTableApi(service.id, droppingTable);
      if (res.success) {
        toast.show({
          type: "success",
          title: isMongo ? "Collection dropped" : "Table dropped",
          description: `${droppingTable} was removed`,
        });
        setIsDropTableOpen(false);
        setDroppingTable("");
        setSelectedTable("");
        fetchOverview();
      } else {
        throw new Error(res.error || "Failed to drop table");
      }
    } catch (err: any) {
      toast.show({
        type: "error",
        title: "Error dropping table",
        description: err.message,
      });
    }
  };

  // Open Edit Modal with prefilled form
  const openEditModal = (row: Record<string, any>) => {
    setEditingRow(row);
    if (isRedis && row.value !== undefined) {
      const redisForm = {
        key: selectedTable,
        value: row.value,
        ttl: row.ttl || "-1",
      };
      setEditFormData(redisForm);
      setEditRowData(JSON.stringify(redisForm, null, 2));
    } else {
      setEditFormData({ ...row });
      setEditRowData(JSON.stringify(row, null, 2));
    }
    setEditRowMode("form");
    setIsEditRowOpen(true);
  };

  const currentColumns = useMemo(() => {
    if (tableData?.columns && tableData.columns.length > 0) return tableData.columns;
    if (tableData?.schema && tableData.schema.length > 0) return tableData.schema.map((s) => s.name);
    return [];
  }, [tableData?.columns, tableData?.schema]);

  const currentRows = useMemo(() => {
    return Array.isArray(tableData?.rows) ? tableData.rows : [];
  }, [tableData?.rows]);

  // Open Add Modal with structured form template
  const openAddModal = () => {
    const initialForm: Record<string, any> = {};
    if (isRedis) {
      initialForm["value"] = "";
      initialForm["ttl"] = "-1";
    } else {
      const colsToUse =
        currentColumns.length > 0
          ? currentColumns
          : tableData?.schema?.map((s) => s.name) || (isMongo ? ["name"] : ["title"]);

      colsToUse.forEach((col) => {
        initialForm[col] = "";
      });
    }

    setRowFormData(initialForm);
    setNewRowData(JSON.stringify(initialForm, null, 2));
    setAddRowMode("form");
    setIsAddRowOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER BANNER */}
      <Card className="relative overflow-hidden border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <LanguageLogo language={overview?.db_type || "postgres"} className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white capitalize">
                  {overview?.db_type || "PostgreSQL"} Database Manager
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  Docker Container Connected
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Direct container query execution via build engine. Database:{" "}
                <span className="font-mono text-cyan-300 font-medium">
                  {overview?.database || service.slug}
                </span>{" "}
                • User:{" "}
                <span className="font-mono text-zinc-300">
                  {overview?.username || "kospaces"}
                </span>{" "}
                • Host:{" "}
                <span className="font-mono text-zinc-300">
                  {overview?.host || "localhost"}:{overview?.port || 5432}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {overview?.connection_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(overview.connection_url, "top_url")}
                className="gap-2 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
              >
                {copiedKey === "top_url" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied URL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Connection URL</span>
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOverview();
                if (selectedTable) fetchTableData(selectedTable, page, limit);
              }}
              disabled={isLoadingOverview || isLoadingTableData}
              className="gap-2 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${
                  isLoadingOverview || isLoadingTableData ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. DATA EXPLORER (TABLES, COLLECTIONS & KEYS) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* SIDEBAR: KEY / TABLE LIST */}
        <div className="md:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              {isRedis ? "Keys" : isMongo ? "Collections" : "Tables"} ({filteredTables.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateTableOpen(true)}
              className="h-7 px-2 text-[11px] gap-1 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300"
            >
              <Plus className="w-3 h-3" />
              <span>{isRedis ? "New Key" : "New"}</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder={`Search ${isRedis ? "keys" : isMongo ? "collections" : "tables"}...`}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-zinc-950/80 border-zinc-800"
            />
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {isLoadingOverview ? (
              <div className="flex items-center justify-center p-6 text-zinc-500 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Loading {isRedis ? "keys" : "tables"}...</span>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-950/40">
                {isRedis ? (
                  <KeyRound className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                ) : (
                  <Table className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                )}
                <p className="text-xs text-zinc-400">
                  No {isRedis ? "keys" : isMongo ? "collections" : "tables"} found
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateTableOpen(true)}
                  className="mt-3 text-[11px] h-7 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create {isRedis ? "Key" : isMongo ? "Collection" : "Table"}</span>
                </Button>
              </div>
            ) : (
              filteredTables.map((t) => {
                const isSelected = selectedTable === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTable(t.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isRedis ? (
                        <KeyRound className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                      ) : (
                        <Table className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                      )}
                      <span className="truncate font-mono">{t.name}</span>
                    </div>
                    {!isRedis && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0 font-mono">
                        {t.estimated_rows}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* MAIN CONTENT: TABLE / KEY DATA VIEW */}
        <div className="md:col-span-9 space-y-4">
          {!selectedTable ? (
            <Card className="p-12 text-center border-dashed border-zinc-800 bg-zinc-950/40">
              {isRedis ? (
                <KeyRound className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              ) : (
                <Table className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              )}
              <h4 className="text-sm font-semibold text-white">
                Select a {isRedis ? "Redis key" : isMongo ? "collection" : "table"}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Pick a {isRedis ? "key" : isMongo ? "collection" : "table"} from the left sidebar to inspect and manage its data.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* ACTION TOOLBAR */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-850">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {isRedis ? `Key: ${selectedTable}` : selectedTable}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      {isRedis
                        ? `${(tableData?.rows?.[0]?.type || "STRING").toUpperCase()}`
                        : `${tableData?.total_rows ?? 0} ${isMongo ? "documents" : "rows"}`}
                    </span>
                    {isRedis && tableData?.rows?.[0]?.ttl !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        TTL: {tableData.rows[0].ttl === "-1" ? "Persistent" : `${tableData.rows[0].ttl}s`}
                      </span>
                    )}
                  </div>

                  {isSQL && (
                    <div className="flex items-center rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
                      <button
                        onClick={() => setActiveTableView("data")}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          activeTableView === "data"
                            ? "bg-zinc-800 text-white font-semibold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Data Grid
                      </button>
                      <button
                        onClick={() => setActiveTableView("schema")}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          activeTableView === "schema"
                            ? "bg-zinc-800 text-white font-semibold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Schema ({tableData?.schema?.length || 0})
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openAddModal}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isRedis ? "Set Value" : `Add ${isMongo ? "Document" : "Row"}`}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDroppingTable(selectedTable);
                      setIsDropTableOpen(true);
                    }}
                    className="gap-1.5 text-xs h-8 text-rose-400 border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRedis ? "Delete Key" : "Drop"}</span>
                  </Button>
                </div>
              </div>

              {/* VIEW 1: DATA GRID */}
              {activeTableView === "data" && (
                <Card className="border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
                  {isLoadingTableData ? (
                    <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="text-xs">Loading records from Docker container...</span>
                    </div>
                  ) : !tableData || currentRows.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileJson className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400">
                        Table <span className="font-mono text-zinc-300 font-semibold">{selectedTable}</span> is empty.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={openAddModal}
                        className="mt-4 gap-2 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert First {isMongo ? "Document" : "Record"}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {/* GRID TABLE */}
                      <div className="overflow-x-auto max-h-[550px] scrollbar-thin scrollbar-thumb-zinc-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 text-zinc-300 font-semibold">
                            <tr>
                              <th className="p-3 w-16 text-center text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                                #
                              </th>
                              {currentColumns.map((col) => {
                                const colSchema = tableData.schema?.find((s) => s.name === col);
                                return (
                                  <th key={col} className="p-3 font-mono whitespace-nowrap">
                                    <div className="flex flex-col">
                                      <span className="text-white font-medium">{col}</span>
                                      {colSchema && (
                                        <span className="text-[10px] text-zinc-500 font-normal uppercase">
                                          {colSchema.type}
                                        </span>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                              <th className="p-3 w-20 text-right text-zinc-500 font-normal">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850/60 font-mono text-[11px]">
                            {currentRows.map((row, idx) => {
                              const rowNumber = (page - 1) * limit + idx + 1;
                              return (
                                <tr
                                  key={idx}
                                  className="hover:bg-zinc-900/60 transition-colors group"
                                >
                                  <td className="p-3 text-center text-zinc-500 text-[10px]">
                                    {rowNumber}
                                  </td>
                                  {currentColumns.map((col) => {
                                    const val = row[col];
                                    const displayVal =
                                      val === null || val === undefined
                                        ? "NULL"
                                        : typeof val === "object"
                                        ? JSON.stringify(val)
                                        : String(val);

                                    const isNull = val === null || val === undefined;
                                    return (
                                      <td
                                        key={col}
                                        className={`p-3 max-w-[280px] truncate ${
                                          isNull ? "text-zinc-600 italic" : "text-zinc-300"
                                        }`}
                                        title={displayVal}
                                      >
                                        {displayVal}
                                      </td>
                                    );
                                  })}
                                  <td className="p-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => openEditModal(row)}
                                        title="Edit record"
                                        className="p-1 rounded text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setDeletingRow(row);
                                          setIsDeleteRowOpen(true);
                                        }}
                                        title="Delete record"
                                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* PAGINATION BAR */}
                      <div className="flex items-center justify-between p-3 border-t border-zinc-850 bg-zinc-950/90 text-xs text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span>Rows per page:</span>
                          <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                          </select>
                          <span className="text-zinc-500">
                            Showing {(page - 1) * limit + 1} -{" "}
                            {Math.min(page * limit, tableData?.total_rows ?? 0)} of {tableData?.total_rows ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => {
                              const newP = page - 1;
                              setPage(newP);
                              fetchTableData(selectedTable, newP, limit);
                            }}
                            className="h-7 px-2 text-xs border-zinc-800"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          <span className="text-zinc-300 font-mono text-xs">
                            Page {page} of {Math.max(1, tableData?.total_pages ?? 1)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= (tableData?.total_pages ?? 1)}
                            onClick={() => {
                              const newP = page + 1;
                              setPage(newP);
                              fetchTableData(selectedTable, newP, limit);
                            }}
                            className="h-7 px-2 text-xs border-zinc-800"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* VIEW 2: SCHEMA VIEWER */}
              {activeTableView === "schema" && (
                <Card className="border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold">
                        <tr>
                          <th className="p-3 font-mono">Column Name</th>
                          <th className="p-3 font-mono">Data Type</th>
                          <th className="p-3 font-mono">Nullable</th>
                          <th className="p-3 font-mono">Default Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850 font-mono">
                        {tableData?.schema?.map((col) => (
                          <tr key={col.name} className="hover:bg-zinc-900/50">
                            <td className="p-3 text-white font-medium">{col.name}</td>
                            <td className="p-3 text-cyan-400">{col.type}</td>
                            <td className="p-3">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                  col.nullable
                                    ? "bg-zinc-800 text-zinc-400"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold"
                                }`}
                              >
                                {col.nullable ? "YES" : "NO"}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-400 truncate max-w-xs">
                              {col.default || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD ROW / DOCUMENT */}
      {isAddRowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-xl border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Insert New {isMongo ? "Document" : "Record"} into <span className="font-mono text-cyan-300">{selectedTable}</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Fill in the column values using the form below.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAddRowMode("form")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    addRowMode === "form"
                      ? "bg-zinc-800 text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Form UI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewRowData(JSON.stringify(buildInsertPayload(), null, 2));
                    setAddRowMode("json");
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    addRowMode === "json"
                      ? "bg-zinc-800 text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            {addRowMode === "form" ? (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {Object.keys(rowFormData).map((col) => {
                  const colSchema = tableData?.schema?.find((s) => s.name === col);
                  const isAuto =
                    col === "id" ||
                    col === "_id" ||
                    col === "created_at" ||
                    col === "updated_at" ||
                    colSchema?.default?.toLowerCase().includes("nextval") ||
                    colSchema?.default?.toLowerCase().includes("now") ||
                    colSchema?.type?.toLowerCase().includes("serial");
                  const colType = colSchema?.type?.toLowerCase() || "";
                  const isBool = colType.includes("bool");
                  const isNum =
                    colType.includes("int") ||
                    colType.includes("serial") ||
                    colType.includes("numeric") ||
                    colType.includes("decimal") ||
                    colType.includes("float");
                  const isLongText = colType.includes("text") || colType.includes("json");

                  return (
                    <div key={col} className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-zinc-850">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-zinc-200 font-mono">
                            {col}
                          </label>
                          {colSchema?.type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                              {colSchema.type}
                            </span>
                          )}
                          {!colSchema?.nullable && !isAuto && (
                            <span className="text-[10px] text-rose-400 font-mono">* required</span>
                          )}
                        </div>

                        {isAuto && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                            Auto-generated
                          </span>
                        )}
                      </div>

                      {isBool ? (
                        <select
                          value={rowFormData[col] === undefined ? "" : String(rowFormData[col])}
                          onChange={(e) =>
                            setRowFormData((prev) => ({
                              ...prev,
                              [col]:
                                e.target.value === ""
                                  ? colSchema?.nullable
                                    ? null
                                    : false
                                  : e.target.value === "true",
                            }))
                          }
                          className="h-8 w-full px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value="false">FALSE</option>
                          <option value="true">TRUE</option>
                          {colSchema?.nullable && <option value="">NULL</option>}
                        </select>
                      ) : isLongText ? (
                        <textarea
                          rows={3}
                          placeholder={isAuto ? "Leave blank for database default" : `Enter ${col}...`}
                          value={rowFormData[col] ?? ""}
                          onChange={(e) =>
                            setRowFormData((prev) => ({ ...prev, [col]: e.target.value }))
                          }
                          className="w-full bg-zinc-950 text-zinc-200 font-mono text-xs p-2.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500"
                        />
                      ) : (
                        <Input
                          type={isNum && !isAuto ? "number" : "text"}
                          placeholder={
                            isAuto
                              ? "Leave blank for auto-generated value"
                              : `Enter ${col}...`
                          }
                          value={rowFormData[col] ?? ""}
                          onChange={(e) =>
                            setRowFormData((prev) => ({ ...prev, [col]: e.target.value }))
                          }
                          className="h-8 text-xs bg-zinc-950 border-zinc-800 font-mono text-zinc-200"
                        />
                      )}

                      {isAuto && (
                        <p className="text-[10px] text-zinc-500">
                          This field will be automatically generated by the database if left empty.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">Provide the record fields as a valid JSON object:</p>
                <textarea
                  rows={10}
                  value={newRowData}
                  onChange={(e) => setNewRowData(e.target.value)}
                  className="w-full bg-zinc-900 text-cyan-300 font-mono text-xs p-3 rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-850">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddRowOpen(false)}
                disabled={isSubmittingRow}
                className="border-zinc-800"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleInsertRow}
                disabled={isSubmittingRow}
              >
                {isSubmittingRow ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                <span>Insert Record</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 2: EDIT ROW / DOCUMENT */}
      {isEditRowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-xl border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Edit {isMongo ? "Document" : "Record"} in <span className="font-mono text-cyan-300">{selectedTable}</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update the column values below.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEditRowMode("form")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    editRowMode === "form"
                      ? "bg-zinc-800 text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Form UI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditRowData(JSON.stringify(editFormData, null, 2));
                    setEditRowMode("json");
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    editRowMode === "json"
                      ? "bg-zinc-800 text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            {editRowMode === "form" ? (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {Object.keys(editFormData).map((col) => {
                  const colSchema = tableData?.schema?.find((s) => s.name === col);
                  const isPK =
                    col === "id" ||
                    col === "_id" ||
                    colSchema?.default?.toLowerCase().includes("nextval");
                  const colType = colSchema?.type?.toLowerCase() || "";
                  const isBool = colType.includes("bool");
                  const isNum =
                    colType.includes("int") ||
                    colType.includes("serial") ||
                    colType.includes("numeric") ||
                    colType.includes("decimal") ||
                    colType.includes("float");
                  const isLongText = colType.includes("text") || colType.includes("json");

                  return (
                    <div key={col} className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-zinc-850">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-zinc-200 font-mono">
                            {col}
                          </label>
                          {colSchema?.type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                              {colSchema.type}
                            </span>
                          )}
                        </div>

                        {isPK && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                            Primary Key (Locked)
                          </span>
                        )}
                      </div>

                      {isBool ? (
                        <select
                          disabled={isPK}
                          value={editFormData[col] === undefined ? "" : String(editFormData[col])}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              [col]:
                                e.target.value === ""
                                  ? colSchema?.nullable
                                    ? null
                                    : false
                                  : e.target.value === "true",
                            }))
                          }
                          className="h-8 w-full px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                        >
                          <option value="false">FALSE</option>
                          <option value="true">TRUE</option>
                          {colSchema?.nullable && <option value="">NULL</option>}
                        </select>
                      ) : isLongText ? (
                        <textarea
                          disabled={isPK}
                          rows={3}
                          value={
                            typeof editFormData[col] === "object"
                              ? JSON.stringify(editFormData[col], null, 2)
                              : editFormData[col] ?? ""
                          }
                          onChange={(e) =>
                            setEditFormData((prev) => ({ ...prev, [col]: e.target.value }))
                          }
                          className="w-full bg-zinc-950 text-zinc-200 font-mono text-xs p-2.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                        />
                      ) : (
                        <Input
                          disabled={isPK}
                          type={isNum && !isPK ? "number" : "text"}
                          value={editFormData[col] ?? ""}
                          onChange={(e) =>
                            setEditFormData((prev) => ({ ...prev, [col]: e.target.value }))
                          }
                          className="h-8 text-xs bg-zinc-950 border-zinc-800 font-mono text-zinc-200 disabled:opacity-50"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">Update the fields as a JSON object:</p>
                <textarea
                  rows={10}
                  value={editRowData}
                  onChange={(e) => setEditRowData(e.target.value)}
                  className="w-full bg-zinc-900 text-cyan-300 font-mono text-xs p-3 rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-850">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditRowOpen(false)}
                disabled={isSubmittingRow}
                className="border-zinc-800"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateRow}
                disabled={isSubmittingRow}
              >
                {isSubmittingRow ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : null}
                <span>Save Changes</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 3: CREATE TABLE */}
      {isCreateTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-xl border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Create New {isRedis ? "Redis Key" : isMongo ? "Collection" : "Table"}
                </h4>
                <p className="text-xs text-zinc-400">
                  {isRedis
                    ? "Set a new key and value in the Redis in-memory database."
                    : isMongo
                    ? "Define a new MongoDB collection to store BSON documents."
                    : "Define your table structure and column types using the visual schema builder."}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
                  {isRedis ? "Key Name" : isMongo ? "Collection Name" : "Table Name"} <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder={
                    isRedis
                      ? "e.g. session:user_123, cache:homepage, app:status"
                      : isMongo
                      ? "e.g. orders, users, logs"
                      : "e.g. users, products, orders"
                  }
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                />
              </div>

              {isRedis && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
                      Key Value (String / JSON)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter value (e.g. active, 42, or JSON string)..."
                      value={redisInitialValue}
                      onChange={(e) => setRedisInitialValue(e.target.value)}
                      className="w-full bg-zinc-900 text-cyan-300 font-mono text-xs p-2.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
                      TTL in seconds (Optional)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 3600 (leave blank or -1 for persistent)"
                      value={redisInitialTTL}
                      onChange={(e) => setRedisInitialTTL(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Time-To-Live in seconds before key expires. Leave blank for persistent keys.
                    </p>
                  </div>
                </div>
              )}

              {isSQL && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      Columns Schema ({newTableCols.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addColumnRow}
                      className="h-7 px-2 text-[11px] gap-1 text-cyan-400 border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Column</span>
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {newTableCols.map((col, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-zinc-900/70 p-2 rounded-lg border border-zinc-850"
                      >
                        <div className="flex-1 min-w-[120px]">
                          <Input
                            placeholder="Column name"
                            value={col.name}
                            onChange={(e) => updateColumnRow(idx, "name", e.target.value)}
                            className="h-7 text-xs bg-zinc-950 border-zinc-800 font-mono"
                          />
                        </div>

                        <div className="w-36">
                          <select
                            value={col.type}
                            onChange={(e) => updateColumnRow(idx, "type", e.target.value)}
                            className="h-7 w-full px-2 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                          >
                            <option value="SERIAL">SERIAL (Auto PK)</option>
                            <option value="INT AUTO_INCREMENT">INT AUTO_INCREMENT</option>
                            <option value="VARCHAR(255)">VARCHAR(255)</option>
                            <option value="TEXT">TEXT</option>
                            <option value="INTEGER">INTEGER</option>
                            <option value="BIGINT">BIGINT</option>
                            <option value="BOOLEAN">BOOLEAN</option>
                            <option value="TIMESTAMP">TIMESTAMP</option>
                            <option value="TIMESTAMP DEFAULT CURRENT_TIMESTAMP">TIMESTAMP NOW</option>
                            <option value="NUMERIC(10,2)">NUMERIC(10,2)</option>
                            <option value="DATE">DATE</option>
                            <option value="JSONB">JSONB</option>
                            <option value="UUID">UUID</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0 cursor-pointer px-1">
                          <input
                            type="checkbox"
                            checked={col.is_primary_key}
                            onChange={(e) => updateColumnRow(idx, "is_primary_key", e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0"
                          />
                          <span>PK</span>
                        </label>

                        <label className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0 cursor-pointer px-1">
                          <input
                            type="checkbox"
                            disabled={col.is_primary_key}
                            checked={col.is_nullable}
                            onChange={(e) => updateColumnRow(idx, "is_nullable", e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 disabled:opacity-40"
                          />
                          <span>Null</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeColumnRow(idx)}
                          disabled={newTableCols.length <= 1}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {sqlPreview && (
                    <div className="mt-3">
                      <span className="text-[10px] text-zinc-500 font-mono">SQL Preview:</span>
                      <pre className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850 font-mono text-[11px] text-cyan-300 overflow-x-auto mt-1">
                        {sqlPreview}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-850">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateTableOpen(false)}
                className="border-zinc-800"
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateTable}>
                Create {isRedis ? "Key" : isMongo ? "Collection" : "Table"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* CONFIRM DIALOG: DELETE ROW */}
      <ConfirmDialog
        isOpen={isDeleteRowOpen}
        onClose={() => setIsDeleteRowOpen(false)}
        onConfirm={handleDeleteRow}
        title="Delete Record"
        description="Are you sure you want to delete this record from the database? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* CONFIRM DIALOG: DROP TABLE / KEY */}
      <ConfirmDialog
        isOpen={isDropTableOpen}
        onClose={() => setIsDropTableOpen(false)}
        onConfirm={handleDropTable}
        title={`Delete ${isRedis ? "Key" : isMongo ? "Collection" : "Table"} ${droppingTable}`}
        description={`This will permanently delete the ${isRedis ? "key" : isMongo ? "collection" : "table"} and its data from the container.`}
        confirmText={`Delete ${isRedis ? "Key" : "Table"}`}
        variant="danger"
        verificationKeyword={droppingTable}
        verificationPlaceholder={`Type "${droppingTable}" to confirm`}
      />
    </div>
  );
}
