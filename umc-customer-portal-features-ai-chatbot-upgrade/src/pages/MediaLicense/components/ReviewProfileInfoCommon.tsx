import React, { useEffect } from "react";
import { RightOutlined } from "@ant-design/icons";
import "./ReviewProfileInfo.less";
interface ReviewProfileInfoProps {
  expanded: boolean;
  onToggle: () => void;
  sectionTitle:string;
  children?: React.ReactNode;
  className?: string;
  rootClassName?: string;
}
export default function ReviewProfileInfoCommon({
  expanded,
  onToggle,
  sectionTitle,
  children,
  className = "",
  rootClassName = "",
}: ReviewProfileInfoProps) {


  useEffect(() => {
  }, []);
  return (
    <div className={`review-section ${rootClassName}`.trim()}>
      <div className="section-header" onClick={onToggle}>
        <h3 className="section-title">{sectionTitle}</h3>
        <RightOutlined
          className={`toggle-icon review-profile-info-common__toggle-icon ${expanded ? "expanded" : ""}`}
        />
      </div>

      <div className={expanded ? `${className} section-content` : "section-content-collapsed"}>
          {children} 
      </div>
      
    </div>
  );
}
