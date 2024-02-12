import { Button } from "@radix-ui/themes";
import icon from "../../assets/arrow-up-right.svg";


interface TopButtonProps {
  onStartSell: ()=> void;
}

const TopButton = ({ onStartSell }: TopButtonProps) => {
  const handleClick = () => {
    onStartSell();
  };
  return (
    <>
      <Button radius="full" id="button_top" onClick={handleClick}>
        Sell your artwork
        <img src={icon} alt="arrow-up" />
      </Button>
    </>
  );
};

export default TopButton;
