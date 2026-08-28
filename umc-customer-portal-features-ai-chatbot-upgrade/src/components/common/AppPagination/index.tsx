import { Pagination } from "antd";
import type { PaginationProps } from "antd";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { buildPaginationOptionText } from "@/utils/antdLocale";

type AppPaginationProps = PaginationProps & {
  buildOptionText?: (value: string | number) => ReactNode;
};

const AppPagination = (props: AppPaginationProps) => {
  const { i18n } = useTranslation();
  const { showSizeChanger, buildOptionText, ...rest } = props;

  const paginationProps = {
    ...rest,
    showSizeChanger,
    ...(showSizeChanger
      ? {
          buildOptionText:
            buildOptionText ??
            ((value: string | number) =>
              buildPaginationOptionText(value, i18n.language)),
        }
      : {}),
  } as PaginationProps;

  return <Pagination {...paginationProps} />;
};

export default AppPagination;
