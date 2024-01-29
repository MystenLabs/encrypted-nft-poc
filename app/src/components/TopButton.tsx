import { Button } from "@radix-ui/themes";
import icon from "../../assets/arrow-up-right.svg";

const TopButton = () => {
  return (
    <>
      <Button radius="full" id="button_top">
        Sell your artwork
        <img src={icon} alt="arrow-up" />{" "}
      </Button>
    </>
  );
};

export default TopButton;
