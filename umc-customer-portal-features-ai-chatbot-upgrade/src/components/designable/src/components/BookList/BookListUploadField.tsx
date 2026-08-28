import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { observer, useField, useForm } from "@formily/react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Typography,
  Tooltip,
  Row,
  Col,
} from "antd";
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import CustomMessage from "@/components/common/CustomMessage";
import * as XLSX from "xlsx";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import {
  getLanguages,
  getLookupData,
  getISBNstatus,
} from "../../../../../services/services";
import { renderDescriptionTooltip } from "@/components/designable/src/components/FormItemWithHtmlTooltip/renderDescriptionTooltip";
import { validateService302BookRows } from "@/pages/MediaLicense/service302Utils";
import { useServicesStore } from "@/store/services";
import {
  createBookApprovedStatusMap,
  normalizeBookApprovedStatus,
  normalizeIsbn,
} from "@/utils/bookApprovedStatus";
import "./styles.less";
import { useMyRequestDetailStore } from "@/store/myRequestDetail";

const { Option } = Select;
const { Text } = Typography;
const MAX_EXCEL_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_EXCEL_IMPORT_ROWS = 1000;
const ALLOWED_EXCEL_EXTENSIONS = [".xlsx", ".xls"];
const ALLOWED_EXCEL_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "",
]);

const isBookListExcelUploadAllowed = (
  file: Pick<File, "name" | "size" | "type">,
) => {
  const fileName = String(file.name ?? "").toLowerCase();
  const hasAllowedExtension = ALLOWED_EXCEL_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  );

  return (
    hasAllowedExtension &&
    ALLOWED_EXCEL_MIME_TYPES.has(String(file.type ?? "")) &&
    file.size > 0 &&
    file.size <= MAX_EXCEL_UPLOAD_BYTES
  );
};

interface BookItem {
  key: string;
  no: number;
  isbn: string;
  title: string;
  authorName: string;
  author?: string;
  category: string;
  language1: number | string;
  language2: number | string;
  quantity: number;
  status?: number;
}

interface BookListUploadValue {
  totalWeight?: number;
  totalQuantity?: number;
  bookList?: BookItem[];
}

type BookListUploadFieldProps = {
  title?: React.ReactNode;
  description?: string | null;
  hideStatusColumn?: boolean;
  bookStatusLookupHandledExternally?: boolean;
  [key: string]: unknown;
};

type SelectOption = {
  label: string;
  value: number | string;
  nameEn?: string;
  nameAr?: string;
};

type RawLookupItem = Record<string, unknown>;

const BOOK_LIST_TEMPLATE_HEADERS = [
  "No",
  "ISBN",
  "Title",
  "Author",
  "Category",
  "Language1",
  "Language2",
  "Quantity",
];

const normalizeString = (value: unknown) => String(value ?? "").trim();
const isTotalWeightInputAllowed = (value: string) =>
  value.length <= 10 && /^\d*\.?\d*$/.test(value);
const isValidTotalWeight = (value: string) => {
  const weight = Number(value);
  return (
    value.length <= 10 &&
    /^(?:\d+|\d*\.\d+)$/.test(value) &&
    Number.isFinite(weight) &&
    weight > 0
  );
};
const getValidationMessage = (field: unknown) => {
  const selfErrors = (field as { selfErrors?: unknown[] }).selfErrors;
  return Array.isArray(selfErrors) ? selfErrors[0] : undefined;
};
const normalizeHeader = (value: unknown) =>
  normalizeString(value).toLowerCase();
const isBookListTemplateHeaderValid = (row: unknown[] | undefined) =>
  Array.isArray(row) &&
  row.length === BOOK_LIST_TEMPLATE_HEADERS.length &&
  BOOK_LIST_TEMPLATE_HEADERS.every(
    (header, index) => normalizeHeader(row[index]) === normalizeHeader(header),
  );
const normalizeLanguageValue = (value: unknown) => {
  const normalized = normalizeString(value);
  if (!normalized) return normalized;

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : normalized;
};

const getLocalizedName = (item: RawLookupItem, isAr: boolean) => {
  const candidates = isAr
    ? [
        item.nameAr,
        item.NameAr,
        item.labelAr,
        item.nameEn,
        item.NameEn,
        item.labelEn,
        item.name,
        item.label,
      ]
    : [
        item.nameEn,
        item.NameEn,
        item.labelEn,
        item.nameAr,
        item.NameAr,
        item.labelAr,
        item.name,
        item.label,
      ];
  return normalizeString(
    candidates.find((candidate) => normalizeString(candidate)),
  );
};

const getSubjectCategoryValue = (item: RawLookupItem) =>
  normalizeString(
    item.nameEn || item.NameEn || item.code || item.Code || item.id || item.Id,
  );

const normalizeBookItem = (
  item: Partial<BookItem>,
  index: number,
): BookItem => ({
  key: item.key || `book-${index}`,
  no: index + 1,
  isbn: normalizeString(item.isbn),
  title: normalizeString(item.title),
  authorName: normalizeString(item.authorName || item.author),
  author: normalizeString(item.author || item.authorName),
  category: normalizeString(item.category),
  language1: normalizeLanguageValue(item.language1),
  language2: normalizeLanguageValue(item.language2),
  quantity: Number(item.quantity || 0),
  status: normalizeBookApprovedStatus(item.status),
});

const buildBookListValue = (
  current: BookListUploadValue,
  nextBookList: BookItem[],
): BookListUploadValue => {
  const nextValue: BookListUploadValue & Record<string, unknown> = {
    ...current,
    bookList: nextBookList.map((item, index) => ({
      ...item,
      no: index + 1,
      key: item.key || `book-${index}`,
      authorName: normalizeString(item.authorName || item.author),
      author: normalizeString(item.author || item.authorName),
      status: normalizeBookApprovedStatus(item.status),
    })),
    totalQuantity: nextBookList.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    ),
  };

  delete nextValue.totalRows;
  delete nextValue.serviceFees;

  return nextValue;
};

export const BookListUploadField: React.FC<BookListUploadFieldProps> = observer(
  ({
    title,
    description,
    hideStatusColumn,
    bookStatusLookupHandledExternally = false,
    ...restProps
  }) => {
    const { t, i18n } = useTranslation();
    const field = useField<any>();
    const form = useForm();
    const serviceCode = useServicesStore(
      (state) => state.userInfo.servicesCode,
    );
    const current = useMemo<BookListUploadValue>(
      () => (field.value as BookListUploadValue | undefined) || {},
      [field.value],
    );
    const currentRef = React.useRef(current);
    currentRef.current = current;
    const isbnRequestKey = useMemo(
      () =>
        Array.from(
          new Set(
            (current.bookList || [])
              .map((item) => normalizeIsbn(item?.isbn))
              .filter(Boolean),
          ),
        )
          .sort()
          .join("|"),
      [current.bookList],
    );
    const isTotalWeightValidationMessage = useCallback(
      (validationMessage: unknown) =>
        validationMessage === t("common.required") ||
        validationMessage === t("BookList.invalidTotalWeight"),
      [t],
    );
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [totalWeightInput, setTotalWeightInput] = useState(() =>
      current.totalWeight === undefined ? "" : String(current.totalWeight),
    );
    const isUpdatingTotalWeightInputRef = React.useRef(false);
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const isFirstApprovalRejected = useMyRequestDetailStore(
      (state) => state.isFirstApprovalRejected,
    );
    const isReviewMode = field.pattern === "readPretty";
    const isFormLocked =
      form.pattern === "disabled" ||
      form.pattern === "readOnly" ||
      form.pattern === "readPretty" ||
      field.pattern === "disabled" ||
      field.pattern === "readOnly" ||
      field.pattern === "readPretty";
    const hideActionButtons =
      field.pattern === "disabled" ||
      field.pattern === "readOnly" ||
      isReviewMode ||
      isFormLocked;

    const [editingKey, setEditingKey] = useState("");
    const [editingRecord, setEditingRecord] = useState<BookItem | null>(null);
    const [languageItemsRaw, setLanguageItemsRaw] = useState<RawLookupItem[]>(
      [],
    );
    const [hasLoadedLanguages, setHasLoadedLanguages] = useState(false);
    const [categoryItemsRaw, setCategoryItemsRaw] = useState<RawLookupItem[]>(
      [],
    );

    const languageOptions = useMemo<SelectOption[]>(() => {
      return languageItemsRaw
        .filter((item) => {
          const hasName = normalizeString(item.nameEn ?? item.NameEn);
          return hasName && Number.isFinite(Number(item.id ?? item.Id));
        })
        .map((item) => {
          const nameEn = normalizeString(item.nameEn ?? item.NameEn);
          return {
            label: getLocalizedName(item, isAr) || nameEn,
            value: Number(item.id ?? item.Id),
            nameEn,
            nameAr: normalizeString(item.nameAr ?? item.NameAr),
          };
        });
    }, [isAr, languageItemsRaw]);

    const categoryOptions = useMemo<SelectOption[]>(
      () =>
        categoryItemsRaw
          .map((item) => {
            const value = getSubjectCategoryValue(item);
            const label = getLocalizedName(item, isAr) || value;
            return { label, value };
          })
          .filter((item) => item.label && item.value),
      [categoryItemsRaw, isAr],
    );

    const getOptionDisplay = useCallback(
      (raw: number | string, options: SelectOption[]) => {
        const normalized = normalizeString(raw).toLowerCase();
        const option = options.find(
          (item) =>
            String(item.value) === normalizeString(raw) ||
            [item.label, item.nameEn, item.nameAr]
              .filter(Boolean)
              .some(
                (name) => normalizeString(name).toLowerCase() === normalized,
              ),
        );
        return option?.label || raw;
      },
      [],
    );

    const resolveLanguageValue = useCallback(
      (raw: unknown) => {
        const normalized = normalizeString(raw).toLowerCase();
        if (!normalized) return "";
        const option = languageOptions.find(
          (item) =>
            String(item.value) === normalizeString(raw) ||
            [item.label, item.nameEn, item.nameAr]
              .filter(Boolean)
              .some(
                (name) => normalizeString(name).toLowerCase() === normalized,
              ),
        );
        return option?.value ?? normalizeLanguageValue(raw);
      },
      [languageOptions],
    );

    const bookList = useMemo(
      () =>
        (current.bookList || []).map((item, index) =>
          normalizeBookItem(item, index),
        ),
      [current.bookList],
    );
    const validation = useMemo(
      () => validateService302BookRows(bookList),
      [bookList],
    );
    const invalidLanguageIndexes = useMemo(() => {
      const language1 = new Set<number>();
      const language2 = new Set<number>();
      if (!hasLoadedLanguages) {
        return { language1, language2 };
      }

      const hasLanguageOption = (raw: unknown) => {
        const normalized = normalizeString(raw).toLowerCase();
        return (
          Boolean(normalized) &&
          languageOptions.some(
            (item) =>
              String(item.value) === normalizeString(raw) ||
              [item.label, item.nameEn, item.nameAr]
                .filter(Boolean)
                .some(
                  (name) => normalizeString(name).toLowerCase() === normalized,
                ),
          )
        );
      };

      bookList.forEach((book, index) => {
        if (!hasLanguageOption(book.language1)) {
          language1.add(index);
        }
        if (
          normalizeString(book.language2) &&
          !hasLanguageOption(book.language2)
        ) {
          language2.add(index);
        }
      });

      return { language1, language2 };
    }, [bookList, hasLoadedLanguages, languageOptions]);
    const invalidRowIndexSet = useMemo(() => {
      const indexes = new Set(validation.missingRequiredIndexSet);
      bookList.forEach((book, index) => {
        const isbn = normalizeIsbn(book.isbn);
        if (
          validation.duplicateIsbnSet.has(isbn) ||
          validation.invalidIsbnSet.has(isbn) ||
          invalidLanguageIndexes.language1.has(index) ||
          invalidLanguageIndexes.language2.has(index)
        ) {
          indexes.add(index);
        }
      });
      return indexes;
    }, [
      bookList,
      invalidLanguageIndexes,
      validation.duplicateIsbnSet,
      validation.invalidIsbnSet,
      validation.missingRequiredIndexSet,
    ]);
    const firstInvalidRowIndex = useMemo(() => {
      for (let index = 0; index < bookList.length; index += 1) {
        if (invalidRowIndexSet.has(index)) {
          return index;
        }
      }
      return -1;
    }, [bookList.length, invalidRowIndexSet]);
    const invalidRowCount = invalidRowIndexSet.size;
    const totalWeightValidator = useCallback(
      (value: BookListUploadValue | undefined) => {
        const inputValue =
          value?.totalWeight === current.totalWeight
            ? totalWeightInput
            : String(value?.totalWeight ?? "");

        if (!inputValue) {
          return t("common.required");
        }

        if (!isValidTotalWeight(inputValue)) {
          return t("BookList.invalidTotalWeight");
        }

        if (!value?.bookList?.length) {
          return t("common.required");
        }

        return invalidRowCount > 0 ? t("BookList.invalidRows") : "";
      },
      [current.totalWeight, invalidRowCount, t, totalWeightInput],
    );

    useEffect(() => {
      if (isUpdatingTotalWeightInputRef.current) {
        isUpdatingTotalWeightInputRef.current = false;
        return;
      }

      setTotalWeightInput(
        current.totalWeight === undefined ? "" : String(current.totalWeight),
      );
    }, [current.totalWeight]);

    useEffect(() => {
      field.required = true;
      field.setValidator(totalWeightValidator);
    }, [field, totalWeightValidator]);

    useEffect(() => {
      let cancelled = false;

      getLanguages()
        .then((res) => {
          if (cancelled) return;
          setLanguageItemsRaw(Array.isArray(res?.data) ? res.data : []);
          setHasLoadedLanguages(true);
        })
        .catch(() => {
          if (!cancelled) {
            setLanguageItemsRaw([]);
            setHasLoadedLanguages(true);
          }
        });

      getLookupData("SubjectCategories", serviceCode)
        .then((res) => {
          if (cancelled) return;
          setCategoryItemsRaw(Array.isArray(res?.data) ? res.data : []);
        })
        .catch(() => {
          if (!cancelled) {
            setCategoryItemsRaw([]);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [serviceCode]);

    useEffect(() => {
      if (!languageOptions.length || !current.bookList?.length) return;

      let changed = false;
      const nextBookList = current.bookList.map((item, index) => {
        const language1 = resolveLanguageValue(item.language1);
        const language2 = resolveLanguageValue(item.language2);
        if (language1 !== item.language1 || language2 !== item.language2) {
          changed = true;
        }
        return normalizeBookItem({ ...item, language1, language2 }, index);
      });

      if (changed) {
        field.setValue(buildBookListValue(current, nextBookList));
      }
    }, [current, field, languageOptions.length, resolveLanguageValue]);

    useEffect(() => {
      if (bookStatusLookupHandledExternally) return;
      if (
        field.pattern !== "readOnly" &&
        field.pattern !== "disabled" &&
        field.pattern !== "readPretty"
      ) {
        return;
      }

      const isbnList = isbnRequestKey ? isbnRequestKey.split("|") : [];

      if (!isbnList.length) return;
      if (isFirstApprovalRejected === true) return;

      let cancelled = false;
      getISBNstatus(isbnList)
        .then((res) => {
          if (cancelled) return;
          const statusMap = createBookApprovedStatusMap(res?.data);

          if (!statusMap.size) return;

          const latestCurrent = currentRef.current;
          let hasStatusChanged = false;
          const nextBookList = (latestCurrent.bookList || []).map(
            (item, index) => {
              const normalizedItem = normalizeBookItem(item, index);
              const matchedStatus = statusMap.get(
                normalizeIsbn(normalizedItem.isbn),
              );
              const nextStatus =
                matchedStatus !== undefined
                  ? matchedStatus
                  : normalizedItem.status;

              if (nextStatus !== normalizedItem.status) {
                hasStatusChanged = true;
              }

              return {
                ...normalizedItem,
                status: nextStatus,
              };
            },
          );

          if (hasStatusChanged) {
            field.setValue(buildBookListValue(latestCurrent, nextBookList));
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error("Load ISBN status failed:", error);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [
      bookStatusLookupHandledExternally,
      field,
      isbnRequestKey,
      isFirstApprovalRejected,
    ]);

    const clearFieldValidationState = useCallback(() => {
      field.setFeedback?.({
        type: "error",
        messages: [],
      });
      field.setState?.((state: any) => {
        state.selfErrors = [];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.validating = false;
      });
    }, [field]);

    const showRequiredValidationState = useCallback(() => {
      const requiredMessage = t("common.required");
      field.setFeedback?.({
        type: "error",
        messages: [],
      });
      field.setState?.((state: any) => {
        state.selfErrors = [requiredMessage];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.validating = false;
      });
    }, [field, t]);

    const updateBookList = useCallback(
      (nextBookList: BookItem[]) => {
        field.setValue(buildBookListValue(current, nextBookList));

        if (!nextBookList.length) {
          showRequiredValidationState();
          return;
        }

        clearFieldValidationState();
      },
      [clearFieldValidationState, current, field, showRequiredValidationState],
    );

    const updateTotalWeight = useCallback(
      (value: string) => {
        const isNextTotalWeightValid = isValidTotalWeight(value);
        const nextValue: BookListUploadValue & Record<string, unknown> = {
          ...current,
          totalWeight: isNextTotalWeightValid ? Number(value) : undefined,
        };
        delete nextValue.totalRows;
        field.setValue(nextValue);

        if (
          !isValidTotalWeight(totalWeightInput) &&
          isNextTotalWeightValid &&
          isTotalWeightValidationMessage(getValidationMessage(field))
        ) {
          clearFieldValidationState();
        }
      },
      [
        clearFieldValidationState,
        current,
        field,
        isTotalWeightValidationMessage,
        totalWeightInput,
      ],
    );

    const handleTotalWeightChange = useCallback(
      (value: string) => {
        if (!isTotalWeightInputAllowed(value)) {
          return;
        }

        isUpdatingTotalWeightInputRef.current = true;
        setTotalWeightInput(value);
        updateTotalWeight(value);
      },
      [updateTotalWeight],
    );

    useEffect(() => {
      field.setDecoratorProps({
        ...field.decoratorProps,
        enableOutlineFeedback: false,
        feedbackLayout: "none",
      });
    }, [field]);

    useEffect(() => {
      if (invalidRowCount === 0) return;

      field.setState?.(
        (state: {
          selfErrors?: React.ReactNode[];
          selfWarnings?: React.ReactNode[];
          selfSuccesses?: React.ReactNode[];
          validating?: boolean;
        }) => {
        state.selfErrors = [t("BookList.invalidRows")];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.validating = false;
        },
      );
    }, [field, invalidRowCount, t]);

    const openUploadDialog = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleExcelUpload = useCallback(
      (file: File) => {
        if (!isBookListExcelUploadAllowed(file)) {
          CustomMessage.error(t("BookList.message.invalidTemplate"));
          return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, {
              type: "array",
              sheetRows: MAX_EXCEL_IMPORT_ROWS + 1,
            });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              CustomMessage.error(t("BookList.message.invalidTemplate"));
              return;
            }
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              blankrows: false,
              raw: false,
            });
            const rows = jsonData as unknown[][];

            if (!isBookListTemplateHeaderValid(rows[0])) {
              CustomMessage.error(t("BookList.message.invalidTemplate"));
              return;
            }

            const books: BookItem[] = rows
              .slice(1)
              .filter((row) => row.some((cell) => normalizeString(cell)))
              .map((row, index) =>
                normalizeBookItem(
                  {
                    key: `book-${index}`,
                    no: index + 1,
                    isbn: normalizeString(row[1]),
                    title: normalizeString(row[2]),
                    authorName: normalizeString(row[3]),
                    author: normalizeString(row[3]),
                    category: normalizeString(row[4]),
                    language1: resolveLanguageValue(row[5]),
                    language2: resolveLanguageValue(row[6]),
                    quantity: Number(row[7] || 0),
                  },
                  index,
                ),
              );

            updateBookList(books);
            CustomMessage.success(
              t("BookList.message.importSuccess", { count: books.length }),
            );
          } catch (error) {
            console.error("Excel parsing error:", error);
            CustomMessage.error(t("BookList.message.parseFailed"));
          }
        };
        reader.readAsArrayBuffer(file);
        return false;
      },
      [resolveLanguageValue, t, updateBookList],
    );

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        handleExcelUpload(file);
        e.target.value = "";
      },
      [handleExcelUpload],
    );

    const startEdit = useCallback((record: BookItem) => {
      setEditingKey(record.key);
      setEditingRecord({ ...record });
    }, []);

    const cancelEdit = useCallback(() => {
      setEditingKey("");
      setEditingRecord(null);
    }, []);

    const saveEdit = useCallback(() => {
      if (!editingRecord) return;

      const nextRecord = normalizeBookItem(editingRecord, editingRecord.no - 1);
      const nextBookList = bookList.map((book) =>
        book.key === editingKey ? nextRecord : book,
      );
      updateBookList(nextBookList);
      setEditingKey("");
      setEditingRecord(null);
    }, [bookList, editingKey, editingRecord, updateBookList]);

    const updateEditingRecord = useCallback(
      (fieldName: keyof BookItem, value: unknown) => {
        if (!editingRecord) return;

        setEditingRecord({
          ...editingRecord,
          [fieldName]:
            fieldName === "quantity"
              ? Number(String(value ?? "").replace(/\D/g, "")) || 0
              : value,
        });
      },
      [editingRecord],
    );

    const renderCellText = useCallback((value: string, invalid = false) => {
      if (invalid) {
        return <Text type="danger">{value || "-"}</Text>;
      }
      return <span>{value || "-"}</span>;
    }, []);

    const columns = useMemo(() => {
      const baseColumns = [
        {
          title: t("BookList.columns.no"),
          dataIndex: "no",
          key: "no",
          width: 60,
        },
        {
          title: t("BookList.columns.isbn"),
          dataIndex: "isbn",
          key: "isbn",
          width: 160,
          render: (text: string, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <Input
                  value={editingRecord?.isbn}
                  onChange={(e) => updateEditingRecord("isbn", e.target.value)}
                  size="small"
                />
              );
            }

            const normalizedIsbn = normalizeIsbn(text);
            const isInvalid =
              !normalizedIsbn ||
              validation.duplicateIsbnSet.has(normalizedIsbn) ||
              validation.invalidIsbnSet.has(normalizedIsbn);

            return renderCellText(text, isInvalid);
          },
        },
        {
          title: t("BookList.columns.title"),
          dataIndex: "title",
          key: "title",
          render: (text: string, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <Input
                  value={editingRecord?.title}
                  onChange={(e) => updateEditingRecord("title", e.target.value)}
                  size="small"
                  maxLength={200}
                />
              );
            }
            return renderCellText(text, !text);
          },
        },
        {
          title: t("BookList.columns.author"),
          dataIndex: "authorName",
          key: "authorName",
          render: (text: string, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <Input
                  value={editingRecord?.authorName}
                  onChange={(e) =>
                    updateEditingRecord("authorName", e.target.value)
                  }
                  size="small"
                  maxLength={100}
                />
              );
            }
            return renderCellText(text, !text);
          },
        },
        {
          title: t("BookList.columns.category"),
          dataIndex: "category",
          key: "category",
          render: (text: string, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <Select
                  value={editingRecord?.category || undefined}
                  onChange={(value) => updateEditingRecord("category", value)}
                  size="small"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="children"
                >
                  {categoryOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              );
            }
            return (
              <span>
                {text ? getOptionDisplay(text, categoryOptions) : "-"}
              </span>
            );
          },
        },
        {
          title: t("BookList.columns.language1"),
          dataIndex: "language1",
          key: "language1",
          width: 130,
          render: (text: number | string, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <Select
                  value={editingRecord?.language1 || undefined}
                  onChange={(value) => updateEditingRecord("language1", value)}
                  size="small"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="children"
                >
                  {languageOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              );
            }
            return renderCellText(
              normalizeString(
                text ? getOptionDisplay(text, languageOptions) : "-",
              ),
              invalidLanguageIndexes.language1.has(record.no - 1),
            );
          },
        },
        {
          title: t("BookList.columns.language2"),
          dataIndex: "language2",
          key: "language2",
          width: 130,
          render: (text: number | string, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <Select
                  value={editingRecord?.language2 || undefined}
                  onChange={(value) => updateEditingRecord("language2", value)}
                  size="small"
                  style={{ width: "100%" }}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {languageOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              );
            }
            return renderCellText(
              normalizeString(
                text ? getOptionDisplay(text, languageOptions) : "-",
              ),
              invalidLanguageIndexes.language2.has(record.no - 1),
            );
          },
        },
        {
          title: t("BookList.columns.quantity"),
          dataIndex: "quantity",
          key: "quantity",
          width: 100,
          render: (text: number, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <Input
                  value={
                    editingRecord?.quantity
                      ? String(editingRecord.quantity)
                      : ""
                  }
                  onChange={(e) =>
                    updateEditingRecord("quantity", e.target.value)
                  }
                  size="small"
                />
              );
            }
            return <span>{text || "-"}</span>;
          },
        },
      ];
      if (hideActionButtons) {
        return [
          ...baseColumns,
          ...(!hideStatusColumn
            ? [
                {
                  title: (
                    <Tooltip
                      title={t("BookList.statusColumnTooltip")}
                      overlayInnerStyle={{ whiteSpace: "pre-line" }}
                    >
                      <span>{t("BookList.columns.status")}</span>
                    </Tooltip>
                  ),
                  dataIndex: "status",
                  key: "status",
                  width: 100,
                  render: (status: number | undefined) => {
                    const normalizedStatus =
                      normalizeBookApprovedStatus(status);
                    if (normalizedStatus === undefined) return "-";

                    const displayStatus =
                      isFirstApprovalRejected === true && normalizedStatus === 1
                        ? 0
                        : normalizedStatus;
                    const statusClass =
                      displayStatus === 1
                        ? "approved"
                        : displayStatus === 0
                        ? "rejected"
                        : "default";
                    const statusText =
                      displayStatus === 1
                        ? t("BookList.statusApproved")
                        : displayStatus === 0
                        ? t("BookList.statusRejected")
                        : t("BookList.statusReviewRequired");

                    return (
                      <span
                        className={`book-list-status-pill book-list-status-pill-${statusClass}`}
                      >
                        {statusText}
                      </span>
                    );
                  },
                },
              ]
            : []),
        ];
      }

      return [
        ...baseColumns,
        {
          title: t("BookList.columns.action"),
          key: "action",
          width: 100,
          render: (_: unknown, record: BookItem) => {
            const isEditing = record.key === editingKey;
            if (isEditing) {
              return (
                <div className="book-list-actions">
                  <Button
                    type="link"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={saveEdit}
                  />
                  <Button
                    type="link"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={cancelEdit}
                  />
                </div>
              );
            }

            return (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => startEdit(record)}
              />
            );
          },
        },
      ];
    }, [
      cancelEdit,
      categoryOptions,
      editingKey,
      editingRecord,
      getOptionDisplay,
      hideActionButtons,
      hideStatusColumn,
      isFirstApprovalRejected,
      invalidLanguageIndexes.language1,
      invalidLanguageIndexes.language2,
      languageOptions,
      renderCellText,
      saveEdit,
      startEdit,
      t,
      updateEditingRecord,
      validation.duplicateIsbnSet,
      validation.invalidIsbnSet,
    ]);

    const cardTitleNode = (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span data-content-editable="x-component-props.title">
          {title || field.title || t("BookList.title")}
          <span className="book-list-title-required" aria-hidden="true">
            *
          </span>
        </span>
        {renderDescriptionTooltip({
          content: typeof description === "string" ? description : null,
          placement: "top",
        })}
      </span>
    );
    const validationMessage = getValidationMessage(field);
    const hasTotalWeightValidationError =
      typeof validationMessage === "string" &&
      (!totalWeightInput ||
        (!isValidTotalWeight(totalWeightInput) &&
          isTotalWeightValidationMessage(validationMessage)));
    const downloadTemplate = useCallback(() => {
      const templateData = [
        [...BOOK_LIST_TEMPLATE_HEADERS],
        [
          1,
          "9781302000011",
          "Sample Book 1",
          "Author 1",
          "Books",
          "English",
          "Arabic",
          2,
        ],
        [
          2,
          "9781302000028",
          "Sample Book 2",
          "Author 2",
          "Books",
          "English",
          "",
          5,
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Books");
      XLSX.writeFile(wb, "publication_book_list_template.xlsx");
    }, []);
    return (
      <div className="book-list-upload-container" {...restProps}>
        <Card className="book-list-header" size="small">
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="header-item">
                <Text strong>
                  {t("BookList.totalWeight")}: {" "}
                  <span
                    className="book-list-upload__total-weight-required"
                    aria-hidden="true"
                  >
                    *
                  </span>
                </Text>
                <div
                  className={`book-list-upload__total-weight-field${
                    hasTotalWeightValidationError
                      ? " book-list-upload__total-weight-field--has-error"
                      : ""
                  }`}
                  {...(hasTotalWeightValidationError
                    ? { "data-form-validation-error": "true" }
                    : {})}
                >
                  <Input
                    className="book-list-upload__total-weight-input"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder={t("BookList.totalWeightPlaceholder")}
                    maxLength={10}
                    required
                    value={totalWeightInput}
                    disabled={isFormLocked}
                    onChange={(event) =>
                      handleTotalWeightChange(event.target.value)
                    }
                  />
                  {hasTotalWeightValidationError && (
                    <Text
                      className="book-list-upload__total-weight-error"
                      type="danger"
                    >
                      {validationMessage}
                    </Text>
                  )}
                </div>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="header-item">
                <Text strong>{t("BookList.totalQuantity")}: </Text>
                <Text className="header-value">
                  {current.totalQuantity || 0}
                </Text>
              </div>
            </Col>
          </Row>
        </Card>

        <Card className="book-list-upload-section" size="small">
          <div className="upload-header">
            <Text>{t("BookList.uploadInstruction")}</Text>
            {!hideActionButtons && (
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={downloadTemplate}
                className="download-template-btn"
              >
                {t("BookList.downloadTemplate")}
              </Button>
            )}
          </div>

          {!hideActionButtons && (
            <Button icon={<UploadOutlined />} onClick={openUploadDialog}>
              {bookList.length > 0
                ? t("BookList.reuploadExcel")
                : t("BookList.uploadExcel")}
            </Button>
          )}
        </Card>
        <Card className="book-list-upload-card" title={cardTitleNode}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <Table
            columns={columns}
            dataSource={bookList}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
            className="book-list-table"
            rowClassName={(_, index) =>
              invalidRowIndexSet.has(index) ? "book-list-table-row-invalid" : ""
            }
            onRow={(_, index) =>
              index === firstInvalidRowIndex
                ? ({
                    "data-form-validation-error-target": "true",
                  } as React.HTMLAttributes<HTMLElement>)
                : {}
            }
            locale={{
              emptyText: (
                <EmptyBox
                  customClassName="book-list-empty"
                  title={t("BookList.emptyText")}
                  buttonText={t("BookList.uploadExcelShort")}
                  hasButton={!hideActionButtons}
                  onClick={hideActionButtons ? undefined : openUploadDialog}
                />
              ),
            }}
          />

          {invalidRowCount > 0 && (
            <div
              className="book-list-validation-error"
              data-form-validation-error="true"
            >
              <Text type="danger">{t("BookList.invalidRows")}</Text>
            </div>
          )}

          {invalidRowCount === 0 &&
            !hasTotalWeightValidationError &&
            typeof validationMessage === "string" && (
              <div
                className="book-list-validation-error"
                data-form-validation-error="true"
              >
                <Text type="danger">{validationMessage}</Text>
              </div>
            )}
        </Card>
      </div>
    );
  },
);
