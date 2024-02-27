import { Heading, Button } from "@radix-ui/themes";
import ArrowLeft from "../../assets/arrow_left.svg";
import { Dispatch, SetStateAction } from "react";
import StepTracker from "./stepTracker";

interface SellTopProps {
    setStep: Dispatch<SetStateAction<number>>;
    step: number;
}

const SellTop = ({step, setStep}: SellTopProps) => {
    const goBack = () => {
        setStep(step - 1);
    }
  return (
    <>
      <Button onClick={goBack}><img src={ArrowLeft}/> Back</Button>
      <Heading>Sell your Artwork</Heading>
      <StepTracker currentStep={step} />
    </>
  );
};

export default SellTop;
