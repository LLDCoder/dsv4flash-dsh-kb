import React from "react";
import { useTranslation } from "react-i18next";
import { Steps, Progress } from "antd";
import "./ApplicationProgress.less";
import FirstIcon from "@/assets/images/first.svg";
import FirstFinishIcon from "@/assets/images/first-finish.svg";
import SecondGoldIcon from "@/assets/images/second-gold.svg";
import SecondIcon from "@/assets/images/second.svg";

interface ApplicationProgressProps {
  currentStep?: number;
  steps: { title: string; description?: string; icon?: React.ReactNode }[];
}

export default function ApplicationProgress({
  currentStep = 1,
  steps,
}: ApplicationProgressProps) {
  const { t } = useTranslation();
  const progressPercent =
    steps.length > 0
      ? Math.round(
          (Math.min(Math.max(currentStep - 1, 0), steps.length) /
            steps.length) *
            100
        )
      : 0;
  const { Step } = Steps;
  // const steps = [
  //   {
  //     title: "Media Activity",
  //     status: (currentStep > 1 ? "finish" : "process") as const,
  //   },
  //   {
  //     title: "Review & Submit",
  //     status: (currentStep === 2 ? "process" : "wait") as const,
  //   },
  // ];

  return (
    <div className="application-progress-card">
      <h3 className="card-title">
        {t("serviceApplicationSidebar.applicationProgressTitle")}
      </h3>

      <div className="progress-info">
        <div className="progress-header">
          <span className="progress-label">
            {t("serviceApplicationSidebar.overallProgress")}
          </span>
          <span className="progress-value">{progressPercent}%</span>
        </div>
        <Progress
          percent={progressPercent}
          showInfo={false}
          strokeColor={{ "0%": "#C19453", "100%": "#9E7538" }}
          trailColor="#E8E8E8"
          className="progress-bar"
        />
      </div>

      <Steps
        current={currentStep - 1}
        direction="vertical"
        className="progress-steps"
      >
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            status={step.status}
            icon={null}
          />
        ))}
      </Steps>
    </div>
  );
}
