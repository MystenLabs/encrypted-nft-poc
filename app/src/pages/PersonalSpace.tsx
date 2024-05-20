// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flex, Box, Button } from "@radix-ui/themes";
import { useMarket } from "../web3hooks";
import { useCurrentAccount } from "@mysten/dapp-kit";
import NFTPage from "./NFTPage";
import NFTCard from "../components/NFTCard";
import "../styles/marketplace.css";

export const PersonalSpace = () => {
  const { getOwnedNFTs } = useMarket();
  const [isFilterPushed] = useState(false);
  const [nftIndex, setNftIndex] = useState(-1);

  const account = useCurrentAccount();

  const { data, isLoading } = useQuery({
    queryKey: [account?.address, nftIndex],
    queryFn: async () => {
      if (account?.address === undefined) return [];
      return await getOwnedNFTs(account?.address);
    },
    // select:
  });

  const openNFTPage = (index: number) => {
    setNftIndex(index);
  };
  const closeNFTPage = () => {
    setNftIndex(-1);
  };

  // const filterMine = () => {
  //   if (isFilterPushed) {
  //     setFilteredData(data);
  //   } else {
  //     setFilteredData(
  //       data.filter((item) => {
  //         return item.seller === account?.address;
  //       }),
  //     );
  //   }
  //   setIsFilterPushed(!isFilterPushed);
  // };

  if (isLoading) return <div>Loading...</div>;
  else if (nftIndex === -1) {
    return (
      <Box style={{ height: "100%" }}>
        <Flex
          gap="2"
          wrap="wrap"
          grow="1"
          shrink="0"
          style={{ flexBasis: "20%" }}
        >
          {data &&
            data.map((item, index) => {
              return (
                <NFTCard
                  key={index}
                  name={item.name}
                  image={item.image_url}
                  id={item.id}
                  owner={account?.address!}
                  index={index}
                  openNFTPage={openNFTPage}
                />
              );
            })}
        </Flex>
      </Box>
    );
  } else {
    if (!data || data[nftIndex] === undefined) return <div>loading...</div>;
    const nft = data[nftIndex];
    return (
      <>
        <NFTPage
          id={nft.id}
          name={nft.name}
          image={nft.image_url}
          owner={nft.seller}
          cipherURL={nft.ciphertext_url}
          ephemeral={nft.ephemeral}
          ciphertext={nft.ciphertext}
          close={closeNFTPage}
        />
      </>
    );
  }
};
