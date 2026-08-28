import { CustomButton } from "@/components/common";
import EmptyBoxIcon from "@/assets/images/empty.svg";

const EmptyBox = (props: any) => {
  const { title, onClick, buttonText } = props;
  return (
    <div className="empty-state">
      <img src={EmptyBoxIcon} alt="empty" className="empty-icon" />
      <p className="empty-text">{title}</p>
      <CustomButton text={buttonText} variant="outline" onClick={onClick} />
    </div>
  );
};

export default EmptyBox;
