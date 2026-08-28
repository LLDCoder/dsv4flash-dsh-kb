import React from "react";
import arEG from "antd/lib/locale/ar_EG";
import enUS from "antd/lib/locale/en_US";
import i18n from "@/localization/config";

export function getAntdLocale(language: string) {
  if (language.toLowerCase().startsWith("ar")) {
    return {
      ...arEG,
      Pagination: {
        ...arEG.Pagination,
        items_per_page: String(
          i18n.t("common.pagination.itemsPerPage", { lng: "ar" }),
        ),
      },
    };
  }
  return enUS;
}

export function buildPaginationOptionText(
  value: string | number,
  language: string,
): React.ReactNode {
  const pageLabel = String(
    i18n.t("common.pagination.page", { lng: language }),
  );
  return React.createElement("span", { dir: "ltr" }, `${value}/${pageLabel}`);
}
