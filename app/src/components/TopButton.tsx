import { Button } from "@radix-ui/themes";
import icon from "../../assets/arrow-up-right.svg";

interface TopButtonProps {
  onStart: () => void;
}

const TopButton = ({ onStart }: TopButtonProps) => {
  const handleClick = () => {
    onStart();
  };
  return (
    <>
      <Button radius="full" id="button_top" onClick={handleClick}>
        List a NFT
        <img src={icon} alt="arrow-up" />
      </Button>
    </>
  );
};

export default TopButton;
