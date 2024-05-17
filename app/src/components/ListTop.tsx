// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Heading, Button } from "@radix-ui/themes";
import ArrowLeft from "../../assets/arrow_left.svg";
import { Dispatch, SetStateAction } from "react";
import StepTracker from "./stepTracker";

interface SellTopProps {
    setStep: Dispatch<SetStateAction<number>>;
    step: number;
}

export const ListTop = ({step, setStep}: SellTopProps) => {
    const goBack = () => {
        setStep(step - 1);
    }
  return (
    <>
      <Button onClick={goBack}><img src={ArrowLeft}/> Back</Button>
      <Heading>List your Artwork</Heading>
      <StepTracker currentStep={step} />
    </>
  );
};
