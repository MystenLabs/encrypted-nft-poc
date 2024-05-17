// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Flex } from "@radix-ui/themes";
import "../styles/tooltip.css";
import SuiSymbol from "../../assets/sui-symbol.svg";
interface NFTCardProps {
  image: string;
  name: string;
  id: string;
  owner: string;
  index: number;
  openNFTPage: (index: number) => void;
}
const NFTCard = ({
  image,
  name,
  index,
  openNFTPage,
}: NFTCardProps) => {

  const clicked = () => {
    openNFTPage(index);
  };
  return (
      <Flex
        direction={"column"}
        align-items={"flex-start"}
        align-self={"stretch"}
        className="nft-card"
        onClick={clicked}
        style={{
          cursor: "pointer",
          margin: "5px",
        }}
      >
        <img src={image} alt={name} />
        <Flex direction={"row"}>
        <img
            src={SuiSymbol}
            style={{ height: "1em", width: "auto", margin: "5px" }}
          />
          Name: {name}
        </Flex>
      </Flex>
  );
};

export default NFTCard;
