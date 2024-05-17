// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Flex } from "@radix-ui/themes";
import { useState } from "react";
import {ListTop} from "../components/ListTop";
import {ListBot} from "../components/ListBot";

interface SellPageProps {
  onFinish: () => void;
}

export const ListPage = ({ onFinish }: SellPageProps) => {
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
        style={{ backgroundColor: "white", height: "7%", width: "100%", padding: "20px 32px" }}
      >
        <ListTop step={step} setStep={setStep} />
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
        <ListBot step={step} goNext={goNext} />
      </Flex>
    </>
  );
};
