// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Box, Flex } from "@radix-ui/themes";
import checkIcon from "../../assets/check.svg";
import lineIcon from "../../assets/tracker_line.svg";

interface StepTrackerProps {
  currentStep: number;
}

const StepTracker = ({ currentStep }: StepTrackerProps) => {
  return (
    <Flex direction={"row"} justify={"center"} align={"center"}>
      <Box m="1">
        {currentStep === 1 ? (
          1
        ) : (
          <Box style={{ backgroundColor: "green", borderRadius: "50px" }}>
            <img src={checkIcon} />
          </Box>
        )}
      </Box>
      <Box>
        <img src={lineIcon} />
      </Box>
      <Box m="1">
        {currentStep === 2 ? (
          2
        ) : currentStep > 2 ? (
          <Box style={{ backgroundColor: "green", borderRadius: "50px" }}>
            <img src={checkIcon} />
          </Box>
        ) : (
          "•"
        )}
      </Box>
      <Box>
        <img src={lineIcon} />
      </Box>
      <Box m="1">{currentStep === 3 ? 3 : "•"}</Box>
    </Flex>
  );
};

export default StepTracker;
