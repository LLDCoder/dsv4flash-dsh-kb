import type { ReactNode } from "react";
import type { PaginationProps } from "antd";
import type { TablePaginationConfig } from "antd/es/table";
import { buildPaginationOptionText } from "@/utils/antdLocale";

type PaginationWithOptionText = PaginationProps & {
  buildOptionText?: (value: string | number) => ReactNode;
};

type TablePaginationWithOptionText = TablePaginationConfig & {
  buildOptionText?: (value: string | number) => ReactNode;
};

export function withPaginationOptionText(
  pagination: PaginationProps | false | undefined,
  language: string,
): PaginationWithOptionText | false | undefined {
  if (!pagination || !pagination.showSizeChanger) {
    return pagination;
  }

  return {
    ...pagination,
    buildOptionText:
      (pagination as PaginationWithOptionText).buildOptionText ??
      ((value: string | number) => buildPaginationOptionText(value, language)),
  };
}

export function withTablePaginationOptionText(
  pagination: TablePaginationConfig | false | undefined,
  language: string,
): TablePaginationWithOptionText | false | undefined {
  if (!pagination || !pagination.showSizeChanger) {
    return pagination;
  }

  return {
    ...pagination,
    buildOptionText:
      (pagination as TablePaginationWithOptionText).buildOptionText ??
      ((value: string | number) => buildPaginationOptionText(value, language)),
  };
}
