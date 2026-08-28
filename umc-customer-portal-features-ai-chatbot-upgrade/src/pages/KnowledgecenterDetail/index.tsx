import { useMemo } from "react";
import "./index.less";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import { KNOWLEDGE_ITEMS } from "@/pages/Knowledgecenter/knowledgeData";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface StepItem {
  id: number;
  title: string;
  content?: string;
  details: Array<{
    title?: string;
    description: string;
  }>;
  detailListType?: "ordered" | "unordered";
}

export default function KnowledgeCenterDetail() {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();

  const knowledgeItem = useMemo(() => {
    const idParam = new URLSearchParams(location.search).get("id");
    const id = Number(idParam);

    if (!idParam || !Number.isInteger(id)) {
      return null;
    }

    return KNOWLEDGE_ITEMS.find((item) => item.id === id) ?? null;
  }, [location.search]);

  const detailDefinition = knowledgeItem?.detail;
  const detailPage = useMemo(() => {
    if (!detailDefinition) {
      return null;
    }

    const translateDetailKey = (key: string) => t(key);

    return {
      intro: translateDetailKey(detailDefinition.introKey),
      guidance: translateDetailKey(detailDefinition.guidanceKey),
      steps: detailDefinition.sections.map<StepItem>((section) => ({
        id: section.id,
        title: translateDetailKey(section.titleKey),
        content: section.contentKey
          ? translateDetailKey(section.contentKey)
          : undefined,
        details: [
          ...(section.detailItems?.map((item) => ({
            title: translateDetailKey(item.titleKey),
            description: translateDetailKey(item.descriptionKey),
          })) ?? []),
          ...(section.detailKeys?.map((key) => ({
            description: translateDetailKey(key),
          })) ?? []),
        ],
        detailListType: section.detailListType,
      })),
    };
  }, [detailDefinition, t]);

  const goBackToKnowledgeCenter = () => {
    history.push("/knowledge-center");
  };

  if (!detailPage) {
    return (
      <div className="KnowledgeCenterDetail">
        <button
          type="button"
          className="back-button"
          onClick={goBackToKnowledgeCenter}
        >
          {t("homeInitialization.knowledgeCenterTitle")}
        </button>
        <EmptyBox title={t("common.noData")} />
      </div>
    );
  }

  return (
    <div className="KnowledgeCenterDetail">
      {/* <button
        type="button"
        className="back-button"
        onClick={goBackToKnowledgeCenter}
      >
        {t("homeInitialization.knowledgeCenterTitle")}
      </button>

      <div className="detail-intro">{detailPage.intro}</div> */}

      <div className="steps-container">
        {detailPage.steps.map((step) => {
          const DetailsList =
            step.detailListType === "ordered" ? "ol" : "ul";

          return (
            <div key={step.id} className="step-item">
              <div className="step-title-row">
                <span className="step-number">{step.id}.</span>
                <h2 className="step-title">{step.title}</h2>
              </div>

              {step.content && (
                <div className="step-content">{step.content}</div>
              )}

              {step.details.length > 0 && (
                <div className="step-details">
                  <DetailsList className="details-list">
                    {step.details.map((detail, detailIndex) => (
                      <li
                        key={`${step.id}-${detailIndex}`}
                        className="detail-item"
                      >
                        {detail.title && (
                          <span className="detail-item-title">
                            {detail.title}
                          </span>
                        )}
                        <span className="detail-item-description">
                          {detail.description}
                        </span>
                      </li>
                    ))}
                  </DetailsList>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* <div className="detail-guidance">{detailPage.guidance}</div> */}
    </div>
  );
}
