import { apiClient } from "./client";

export interface TableOverviewItem {
  name: string;
  estimated_rows: number;
}

export interface DatabaseOverview {
  db_type: string;
  database: string;
  username: string;
  host: string;
  port: number;
  connection_url: string;
  service_status: string;
  tables: TableOverviewItem[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

export interface TableDataResponse {
  table: string;
  columns: string[];
  schema?: ColumnSchema[];
  rows: Record<string, any>[];
  total_rows: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface QueryExecutionResult {
  success: boolean;
  columns?: string[];
  rows?: Record<string, any>[];
  row_count: number;
  raw_output?: string;
  execution_ms: number;
  error?: string;
}

export interface TableColumnDef {
  name: string;
  type: string;
  is_primary_key?: boolean;
  is_nullable?: boolean;
}

export async function getDatabaseOverviewApi(serviceId: string): Promise<DatabaseOverview> {
  return apiClient<DatabaseOverview>(`/services/${serviceId}/database/overview`);
}

export async function getTableDataApi(
  serviceId: string,
  table: string,
  page = 1,
  limit = 50,
  search = ""
): Promise<TableDataResponse> {
  return apiClient<TableDataResponse>(
    `/services/${serviceId}/database/tables/${encodeURIComponent(table)}/data`,
    {
      params: { page, limit, search: search || undefined },
    }
  );
}

export async function executeDatabaseQueryApi(
  serviceId: string,
  query: string
): Promise<QueryExecutionResult> {
  return apiClient<QueryExecutionResult>(`/services/${serviceId}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export async function insertTableRowApi(
  serviceId: string,
  table: string,
  data: Record<string, any>
): Promise<QueryExecutionResult> {
  return apiClient<QueryExecutionResult>(
    `/services/${serviceId}/database/tables/${encodeURIComponent(table)}/rows`,
    {
      method: "POST",
      body: JSON.stringify({ data }),
    }
  );
}

export async function updateTableRowApi(
  serviceId: string,
  table: string,
  primaryKey: string,
  keyValue: any,
  data: Record<string, any>
): Promise<QueryExecutionResult> {
  return apiClient<QueryExecutionResult>(
    `/services/${serviceId}/database/tables/${encodeURIComponent(table)}/rows`,
    {
      method: "PUT",
      body: JSON.stringify({
        primary_key: primaryKey,
        key_value: keyValue,
        data,
      }),
    }
  );
}

export async function deleteTableRowApi(
  serviceId: string,
  table: string,
  primaryKey: string,
  keyValue: any
): Promise<QueryExecutionResult> {
  return apiClient<QueryExecutionResult>(
    `/services/${serviceId}/database/tables/${encodeURIComponent(table)}/rows`,
    {
      method: "DELETE",
      body: JSON.stringify({
        primary_key: primaryKey,
        key_value: keyValue,
      }),
    }
  );
}

export async function createTableApi(
  serviceId: string,
  name: string,
  columns: TableColumnDef[]
): Promise<QueryExecutionResult> {
  return apiClient<QueryExecutionResult>(`/services/${serviceId}/database/tables`, {
    method: "POST",
    body: JSON.stringify({ name, columns }),
  });
}

export async function dropTableApi(serviceId: string, table: string): Promise<QueryExecutionResult> {
  return apiClient<QueryExecutionResult>(
    `/services/${serviceId}/database/tables/${encodeURIComponent(table)}`,
    {
      method: "DELETE",
    }
  );
}

