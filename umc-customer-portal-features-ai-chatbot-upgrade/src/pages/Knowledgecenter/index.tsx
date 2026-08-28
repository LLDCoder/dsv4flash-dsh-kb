import { useState, useEffect, useMemo, useRef } from "react";
import "./index.less";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import {
  getKnowledgeItemUrl,
  KNOWLEDGE_ITEMS,
} from "@/pages/Knowledgecenter/knowledgeData";

export default function KnowledgeCenter() {
  const history = useHistory();
  const [keyWords, setkeyWords] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const { t, i18n } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith("ar"));
  const normalizedKeyword = debouncedKeyword.trim().toLocaleLowerCase();
  const knowledgeList = useMemo(() => {
    if (!normalizedKeyword) {
      return KNOWLEDGE_ITEMS;
    }

    return KNOWLEDGE_ITEMS.filter((item) =>
      [item.titleEn, item.titleAr, item.contentEn, item.contentAr].some(
        (value) => value.toLocaleLowerCase().includes(normalizedKeyword),
      ),
    );
  }, [normalizedKeyword]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (keyWords) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedKeyword(keyWords);
      }, 500);
    } else {
      setDebouncedKeyword(keyWords);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [keyWords]);
  return (
    <div className="KnowledgeCenter ">
      <Input
        prefix={<SearchOutlined className="SearchOutlined" />}
        placeholder={t("formPlaceholders.common.search")}
        className="search-input"
        value={keyWords}
        onChange={(e) => {
          setkeyWords(e.target.value);
        }}
      />
      {knowledgeList.length ? (
        <div className="knowledgeList">
          {knowledgeList.map((item) => {
            return (
              <div className="knowledgeItem" key={item.id}>
                <div>
                  {" "}
                  <div className="knowledgeItem-title">
                    <img src={item.img} alt="" />
                  </div>
                  <div className="knowledgeItem-title">
                    {isArabic
                      ? item.titleAr || item.titleEn
                      : item.titleEn || item.titleAr}
                  </div>
                  <div className="knowledgeItem-content">
                    {isArabic
                      ? item.contentAr || item.contentEn
                      : item.contentEn || item.contentAr}
                  </div>
                </div>

                <div className="knowledgeItem-line">
                  <div
                    className="knowledgeItem-btn"
                    onClick={() => {
                      const url = getKnowledgeItemUrl(item, i18n.language);

                      if (url) {
                        window.open(url, "_blank", "noopener,noreferrer");
                        return;
                      }

                      history.push(
                        `/knowledge-center/knowledge-center-detail?id=${item.id}`,
                      );
                    }}
                  >
                    {t("homeInitialization.learnMore")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-box-wrapper">
          <EmptyBox title={t("common.noData")} />
        </div>
      )}
    </div>
  );
}
