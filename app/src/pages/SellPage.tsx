import { Box, Flex } from "@radix-ui/themes";
import { useState } from "react";
import SellTop from "../components/SellTop";
import SellBot from "../components/SellBot";

interface SellPageProps {
  onFinish: () => void;
}

const SellPage = ({ onFinish }: SellPageProps) => {
  const [step, setStep] = useState(1);

  if (step === 0 || step === 4) {
    onFinish();
  }
  const goNext = () => {
    setStep((oldValue) => oldValue + 1);
  }
  return (
    <>
      <Flex
        direction={"row"}
        justify="between"
        align={"center"}
        style={{ backgroundColor: "white", height: "35%", width: "100%", padding: "20px 32px" }}
      >
        <SellTop step={step} setStep={setStep}></SellTop>
      </Flex>
      <Flex
        direction={"column"}
        justify-content={"center"}
        align={"center"}
        style={{
          width: "100%",
          height: "65%",
          marginTop: "40px",
          textAlign: "left",
          padding: "32px",
        }}
      >
        <SellBot step={step} goNext={goNext} />
      </Flex>
    </>
  );
};

export default SellPage;
