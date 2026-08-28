import { useHistory } from "react-router-dom";
import "./ServiceCard.less";
import { useState, useMemo, useRef, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { CustomButton } from "@/components/common";
import FrameIcon from "@/assets/images/Frame.svg";
import { getServiceCategoryIconSrc } from "@/pages/Services/categoryIcons";
import { Tooltip } from 'antd';
import { StarOutlined, StarFilled } from "@ant-design/icons";

interface UserTypeLabel {
  value: string;
  label: string;
}

interface ServiceCardProps {
  service: {
    id: number;
    title?: string;
    iconUri?: string | null;
    tags?: string[];
    serviceCategoryNameEn?: string | null;
    serviceCategoryNameAr?: string | null;
    nameEn?: string | null;
    nameAr?: string | null;
    code?: string | null;
    isCollect?: boolean;
    isFavorite?: boolean;
    userTypes?: string[];
    userTypeLabels?: UserTypeLabel[];
  };
  selectOptions: {
    value: string;
    label: string;
  }[];
  onClickFavorite?: (serviceId: number, isCollected: boolean) => void;
  onStartService: (service: {
    id: number;
    code?: string;
    nameEn: string;
    nameAr?: string | null;
  }) => void;
  gateLoading?: boolean;
  showFavoriteAction?: boolean;
}

export default function ServiceCard({
  service,
  selectOptions,
  onClickFavorite,
  onStartService,
  gateLoading = false,
  showFavoriteAction = true,
}: ServiceCardProps) {
  const history = useHistory();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const [isCollected, setIsCollected] = useState(service.isFavorite || false);
  const [isHovered, setIsHovered] = useState(false);
  
  const userTypeLabels = useMemo(() => {
    if (service.userTypeLabels && service.userTypeLabels.length > 0) {
      return service.userTypeLabels.filter((item) => item.label);
    }

    const userTypes = service.userTypes;
    if (!userTypes || userTypes.length === 0) {
      return [];
    }
    
    const allOptions = selectOptions.map(option => option.value);
    const isAllUserTypes = userTypes.length === allOptions.length && userTypes.every(type => allOptions.includes(type));
    
    if (isAllUserTypes) {
      return [{ label: t("servicesPage.allUserTypes"), value: "all" }];
    }
    
    return userTypes
      .map(type => {
        const option = selectOptions.find(opt => opt.value === type);
        return option ? { label: option.label, value: type } : null;
      })
      .filter(Boolean) as { label: string; value: string }[];
  }, [service.userTypeLabels, service.userTypes, selectOptions, t]);

  const handleLearnService = () => {
    history.push(`/services/service-card?id=${service.id}`);
  };

  const toggleCollect = (serviceId: number) => {
    if (!onClickFavorite) {
      return;
    }

    const newCollectedState = !isCollected;
    setIsCollected(newCollectedState);
    onClickFavorite(serviceId, newCollectedState);
  };

  const tagsWrapperRef = useRef<HTMLDivElement>(null);
  const [visibleTagCount, setVisibleTagCount] = useState<number>(userTypeLabels.length);

  useLayoutEffect(() => {
    const wrapper = tagsWrapperRef.current;
    if (!wrapper || userTypeLabels.length === 0) {
      setVisibleTagCount(userTypeLabels.length);
      return;
    }
    const measureEl = wrapper.querySelector<HTMLElement>('.service-tags-measure');
    if (!measureEl) return;
    const tagEls = Array.from(measureEl.querySelectorAll<HTMLElement>('.tag-measure-item'));
    if (tagEls.length === 0) { setVisibleTagCount(0); return; }

    const firstTop = tagEls[0].offsetTop;
    let firstRowCount = tagEls.length;
    for (let i = 1; i < tagEls.length; i++) {
      if (tagEls[i].offsetTop > firstTop) { firstRowCount = i; break; }
    }
    setVisibleTagCount(
      firstRowCount < tagEls.length ? Math.max(1, firstRowCount - 1) : tagEls.length
    );
  }, [userTypeLabels]);

  const hiddenTypeTitle = useMemo(() => (
    <div>
      {userTypeLabels.slice(visibleTagCount).map((item, index) => (
        <p key={index} className="user-type-title">{item.label}</p>
      ))}
    </div>
  ), [userTypeLabels, visibleTagCount]);

  const categoryLabel = isAr
    ? (service.serviceCategoryNameAr ?? service.serviceCategoryNameEn)
    : (service.serviceCategoryNameEn ?? service.serviceCategoryNameAr);

  const serviceTitle = isAr
    ? (service.nameAr ?? service.nameEn ?? service.title ?? "")
    : (service.nameEn ?? service.nameAr ?? service.title ?? "");
  const isFavorited = showFavoriteAction && (isCollected || service.isFavorite);
  const startServicePayload = {
    id: service.id,
    code: service.code || undefined,
    nameEn: service.nameEn ?? service.title ?? "",
    nameAr: service.nameAr ?? service.title ?? "",
  };

  return (
    <div 
      className={`service-card ${isFavorited ? 'service-card--favorited' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {
        service?.isCollect && (
          <div className="service-card-Featured">
            <div className="service-card-Featured-text">{t("servicesPage.featuredBadge")}</div>
          </div>
        )
      }

      <div className="service-card-header">
        <div className="service-icon">
          <img
            src={getServiceCategoryIconSrc(service.iconUri) ?? FrameIcon}
            alt=""
          />
        </div>
        <span className="service-tag">{categoryLabel}</span>
      </div>

      <div className="service-card-body">
        <div className="service-title">{serviceTitle}</div>

        <div ref={tagsWrapperRef} style={{ position: 'relative' }}>
          {/* Hidden measurement layer — renders all tags to detect first-row overflow */}
          <div
            className="service-tags service-tags-measure"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', pointerEvents: 'none' }}
            aria-hidden="true"
          >
            {userTypeLabels.map((item, i) => (
              <span key={i} className="service-tag tag-measure-item">{item.label}</span>
            ))}
          </div>
          {/* Visible tags — capped to first row */}
          <div className="service-tags">
            {userTypeLabels.slice(0, visibleTagCount).map((item, index) => (
              <span key={index} className="service-tag">{item.label}</span>
            ))}
            {visibleTagCount < userTypeLabels.length && (
              <Tooltip
                title={hiddenTypeTitle}
                color="#fff"
                overlayInnerStyle={{ color: '#000', borderRadius: '8px' }}
                getPopupContainer={() => document.body}
                overlayClassName="user-types-tooltip"
                placement="top"
              >
                <span className="service-tag">+{userTypeLabels.length - visibleTagCount}</span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      <div className={`service-card-footer ${showFavoriteAction ? '' : 'service-card-footer--actions-only'}`}>
        {showFavoriteAction && (
          <div className={`service-card-footer-collect ${isCollected || service?.isFavorite ? 'always-visible' : ''} ${!isCollected && !service?.isFavorite && isHovered ? 'hover-visible' : ''}`}>
            <Tooltip
              title={isCollected ? t("servicesPage.cancelFavorite") : t("servicesPage.setAsFavorite")}
              color="#fff"
              getPopupContainer={() => document.querySelector('.service-card-footer') as HTMLElement}
              overlayClassName="collect-tooltip"
              placement="topLeft"
              key={service?.id}
            >
              <span
                onClick={() => toggleCollect(service.id)}
                className="service-card-footer-collect-icon"
              >
                {isCollected ? <StarFilled /> : <StarOutlined />}
              </span>
            </Tooltip>

          </div>
        )}

        <div className="service-card-footer-buttons">
          <CustomButton
            variant="primary"
            customStyle={{ height: 36, padding: '0 12px' }}
            customClassName="learn-more-btn"
            onClick={() => {
              handleLearnService();
            }}
          >
            {t("servicesPage.learnMore")}
          </CustomButton>
          <CustomButton
            variant="primary"
            customStyle={{ height: 36, padding: '0 12px' }}
            className="start-service-btn"
            loading={gateLoading}
            onClick={() => onStartService(startServicePayload)}
          >
            {t("servicesPage.startService")}
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
