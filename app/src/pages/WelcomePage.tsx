// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Box, Flex, Heading } from "@radix-ui/themes";
import { ConnectButton } from "@mysten/dapp-kit";
import logo from "../../assets/Logo.svg";

const WelcomePage = () => {
  return (
    <>
      <Flex
        style={{
          height: "100%",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <Box
          style={{ textAlign: "justify", wordWrap: "break-word", width: "40%" }}
        >
          <Flex
            direction={"row"}
            justify={"start"}
            style={{ marginBottom: "30px", marginTop: "40px" }}
          >
            <img src={logo} alt="Mysten labs"></img>
          </Flex>
          <Box style={{ marginLeft: "5px" }}>
            <Heading size="2">Explore Encrypted NFTs on Sui</Heading>
            <p>
              Your hub for exploring Encrypted NFT artworks. Join the community
              and discover the world of digital obfuscated art ownership.
            </p>
          </Box>
          <ConnectButton style={{ marginTop: "20px" }} />
        </Box>
      </Flex>
    </>
  );
};

export default WelcomePage;
