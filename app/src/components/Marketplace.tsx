import { useEffect, useState } from "react";
import { Flex } from "@radix-ui/themes";
import { useMarket, Listing } from "../web3hooks";
import NFTCard from "./NFTCard";
import "../styles/marketplace.css";

const Marketplace = () => {
  const { get16NFTs } = useMarket();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Listing[]>([]);

  useEffect(() => {
    const getItems = async () => {
      setIsLoading(true);
      const items = await get16NFTs();
      setData(items);
      setIsLoading(false);
    };
    getItems();
  }, []);
  if (isLoading) return <div>Loading...</div>;
  else
    return (
      <>
        <Flex
        gap="2"
        wrap="wrap"
        grow="1"
        shrink="0"
        style={{flexBasis: "21%"}}
        >
          {data.map((listing, index)=> {
            return (
              <NFTCard 
                className="nft-card"
                key={index}
                price={listing.price}
                name={listing.seller}
                image={listing.image}
              />
            )
          })}
        </Flex>
      </>
    );
};

export default Marketplace;
