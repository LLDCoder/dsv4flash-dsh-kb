import { useState, useEffect, useRef } from "react";
import "./index.less";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import HighlightKeyword from "@/components/common/HighlightKeyword";
import { useLocation } from "react-router-dom";
import request from "@/utils/request";
import { useHistory } from "react-router-dom";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import {
  useGlobalServiceProfileSelection,
  useServiceEntryGateDialogController,
} from "@/components/ServiceEntryGate";

interface ServiceModel {
  resourceType: string;
  resourceTypeLabel: string;
  serviceCategoryName?: string;
  dateLabel: string;
  resourceCode: string;
  name: string;
  url: string;
  id: number;
  status: string;
  applicationNum: string;
}
interface slectOptionsInfo {
  label: string;
  value: string;
  count: number;
}
export default function Globalsearch() {
  const history = useHistory();
  const { openDialog, dialogNode } = useServiceEntryGateDialogController();
  const {
    startService: startServiceWithProfileSelection,
    profileSelectionNode,
  } = useGlobalServiceProfileSelection();
  const [SearchInputValidate, setSearchInputValidate] = useState(true);

  const { t } = useTranslation();
  const location = useLocation();
  const [keyword, setkeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [slectOptions, setslectOptions] = useState<slectOptionsInfo[]>([]);
  const [tableOptions, settableOptions] = useState<ServiceModel[]>([]);
  const [tableOptionsFilter, settableOptionsFilter] = useState<ServiceModel[]>(
    []
  );
  const [Choose, setChoose] = useState("all");

  const resetSearchState = () => {
    setDebouncedKeyword("");
    setslectOptions([]);
    settableOptions([]);
    settableOptionsFilter([]);
    setChoose("all");
    setSearchInputValidate(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const keyword = searchParams.get("keyword");
    if (keyword) {
      setkeyword(keyword);
    }
  }, [location.search]);
  useEffect(() => {
    if (keyword.length < 3) {
      if (!keyword) {
        resetSearchState();
      }
      return;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (keyword) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedKeyword(keyword);
      }, 500);
    } else {
      setDebouncedKeyword(keyword);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [keyword]);
  useEffect(() => {
    if (debouncedKeyword) {
      handleKeyPress();
    }
  }, [debouncedKeyword]);

  const handleKeyPress = () => {
    request
      .get("/api/GlobalSearch/search", { query: debouncedKeyword })
      .then((res) => {
        console.log(res.data);
        const options = [];
        for (const key in res.data.categories) {
          options.push(res.data.categories[key]);
        }
        setslectOptions(options);
        settableOptions(res.data.results);
      });
  };
  const filterTable = () => {
    settableOptionsFilter(
      Choose == "all"
        ? tableOptions
        : tableOptions.filter((item) => item.resourceType === Choose)
    );
  };
  useEffect(() => {
    if (!tableOptions.length) return;
    filterTable();
  }, [Choose, tableOptions]);
  const getResourceTypeLabelColor = (resourceTypeLabel: string): string => {
    const label = resourceTypeLabel.toUpperCase();
    if (label === "SERVICES") {
      return "#F29F0E";
    } else if (label === "APPLICATIONS") {
      return "#4A9D5C";
    } else if (label === "LICENSES") {
      return "#EB5F24";
    }
    return "#F29F0E"; // Default color
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    // Convert "2025-12-18" to "18/12/2025"
    const parts = dateString.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString; // Return original if format is unexpected
  };

  const formatDateLabel = (dateLabel: string, resourceTypeLabel: string): string => {
    if (!dateLabel) return "";
    const formattedDate = formatDate(dateLabel);
    const label = resourceTypeLabel.toUpperCase();
    if (label === "LICENSES") {
      return formattedDate;
    }
    return formattedDate;
  };

  const PushRouter = async (type: string, item: ServiceModel) => {
    if (type == "ServiceModel") {
      await startServiceWithProfileSelection({
        history,
        serviceId: item.id,
        serviceCode: item.resourceCode,
        serviceName: item.name,
        source: "global-search",
        openDialog,
      });
    } else if (type == "ApplicationModel") {
      history.push(`/my-requests/detail?id=${item.id}`);
    } else {
      history.push(`/permits-license?search=${item.applicationNum}`);
    }
  };
  return (
    <div className="global-search">
      <div className="global-search-container">
        <Input
          className={!SearchInputValidate ? "warning input" : "input"}
          value={keyword}
          allowClear
          maxLength={100}
          onChange={(e) => {
            const nextValue = e.target.value;
            setkeyword(nextValue);
            if (!nextValue) {
              resetSearchState();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && keyword.length >= 3) {
              handleKeyPress();
              setSearchInputValidate(true);

            } else if (e.key === "Enter" && keyword.length < 3) {
              setSearchInputValidate(false);
            }
          }}
          prefix={<SearchOutlined className="SearchOutlined" />}
          placeholder={t("formPlaceholders.common.search")}
        />

        <div className="character-count-box">
          {!SearchInputValidate && (
            <span className="error_span">{t("header.search.minLengthHint")}</span>
          )}
          <span className="character-count-text">
            {keyword.length}/100
          </span>
        </div>

        <div className="main-box">
          {debouncedKeyword && tableOptions.length ? (
            <>
              <div className="selectbtn">
                {slectOptions.map((item, index) => (
                  <div
                    className={`btnitem${
                      item.value === Choose ? " active" : ""
                    }`}
                    onClick={() => setChoose(item.value)}
                    key={index}
                  >
                    <span>{item.label}</span>
                    <span>({item.count})</span>
                  </div>
                ))}
              </div>
              {tableOptionsFilter.length > 0 ? (
                <div className="tableList">
                  {tableOptionsFilter.map((item, index) => (
                    <div
                      className={`tableitem${index != 0 ? " table-border" : ""}`}
                      key={index}
                      onClick={() => PushRouter(item.resourceType, item)}
                    >
                      <div className="table-container">
                        {" "}
                        <div className="table-title">
                          <span style={{ color: getResourceTypeLabelColor(item.resourceTypeLabel) }}>
                            {item.resourceTypeLabel}
                          </span>{" "}
                          <span>{item.resourceCode}</span>
                        </div>
                        <div className="table-content">
                          <span>
                            <HighlightKeyword
                              text={item.name}
                              keyword={keyword}
                            />
                          </span>
                          {/* {item.resourceType != "ServiceModel" && (
                            <span className="table-status">
                              {item.resourceType}
                            </span>
                          )} */}
                        </div>
                        <div className="table-remarks">
                          {item?.serviceCategoryName}
                          {formatDateLabel(item?.dateLabel, item?.resourceTypeLabel)}
                        </div>
                      </div>
                      {/* <img className="table-img" src={GoldRight} /> */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-box-wrapper">
                  <EmptyBox title={t("common.noData")} />
                </div>
              )}
            </>
          ) : (
            <div className="no_result">{t("multiSelectDropdown.noResults")}</div>
          )}
        </div>
      </div>
      {dialogNode}
      {profileSelectionNode}
    </div>
  );
}
