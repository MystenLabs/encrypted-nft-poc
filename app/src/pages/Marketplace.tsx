import { useEffect, useState } from "react";
import { Flex, Box, Button } from "@radix-ui/themes";
import { useMarket, Listing, Offers } from "../web3hooks";
import { useCurrentAccount } from "@mysten/dapp-kit";
import NFTPage from "./NFTPage";
import NFTCard from "../components/NFTCard";
import "../styles/marketplace.css";
import { is } from "@mysten/sui.js/utils";

const Marketplace = () => {
  const { get16NFTs, getOffers } = useMarket();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Listing[]>([]);
  const [filteredData, setFilteredData] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offers>({});
  const [isFilterPushed, setIsFilterPushed] = useState(false);
  const [nftIndex, setNftIndex] = useState(-1);

  const account = useCurrentAccount();

  const openNFTPage = (index: number) => {
    setNftIndex(index);
  };
  const closeNFTPage = () => {
    setNftIndex(-1);
  };

  const filterMine = () => {
    if (isFilterPushed) {
      setFilteredData(data);
    } else {
      setFilteredData(
        data.filter((item) => {
          return item.seller === account?.address;
        }),
      );
    }
    setIsFilterPushed(!isFilterPushed);
  };

  useEffect(() => {
    const getItems = async () => {
      if (!isLoading) setIsLoading(true);
      const items = await get16NFTs();
      const offers = await getOffers();

      setOffers(offers);
      setData(items);
      setFilteredData(items);

      setIsLoading(false);
    };
    if (nftIndex === -1) getItems();
  }, [nftIndex]);

  if (isLoading) return <div>Loading...</div>;
  else if (nftIndex === -1) {
    return (
      <Box style={{ height: "100%" }}>
        <Button
          style={{
            backgroundColor: isFilterPushed ? "black" : "white",
            color: isFilterPushed ? "white" : "black",
            borderRadius: "24px",
          }}
          onClick={filterMine}
        >
          Mine
        </Button>
        <Flex
          gap="2"
          wrap="wrap"
          grow="1"
          shrink="0"
          style={{ flexBasis: "20%" }}
        >
          {filteredData.map((listing, index) => {
            return (
              <NFTCard
                key={index}
                price={listing.price}
                name={listing.name}
                image={listing.image}
                id={listing.id}
                seller={listing.seller}
                pk={offers[listing.id]?.pk || []}
                index={index}
                openNFTPage={openNFTPage}
              />
            );
          })}
        </Flex>
      </Box>
    );
  } else {
    const nft = filteredData[nftIndex];
    return (
      <>
        <NFTPage
          id={nft.id}
          name={nft.name}
          image={nft.image}
          price={nft.price}
          seller={nft.seller}
          buyer={offers[nft.id]?.buyer || ""}
          isOffer={offers[nft.id] !== undefined}
          secretKey={nft.secretKey}
          close={closeNFTPage}
        />
      </>
    );
  }
};

export default Marketplace;
