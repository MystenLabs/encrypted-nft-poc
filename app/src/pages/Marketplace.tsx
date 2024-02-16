import { useEffect, useState } from "react";
import { Flex, Box, Button } from "@radix-ui/themes";
import { useMarket, Listing, Offers } from "../web3hooks";
import { useCurrentAccount } from "@mysten/dapp-kit";
import AcceptOfferModal from "../components/AcceptOfferModal";
import NFTCard from "../components/NFTCard";
import "../styles/marketplace.css";

const Marketplace = () => {
  const { get16NFTs, getOffers } = useMarket();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Listing[]>([]);
  const [filteredData, setFilteredData] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offers>({});
  const [isFilterPushed, setIsFilterPushed] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [clickedId, setClickedId] = useState<string>("");
  const [clickedPk, setClickedPk] = useState<number[]>([]);

  const account = useCurrentAccount();

  const openModal = (id: string, pk: number[]) => {
    setClickedId(id);
    setClickedPk(pk);
    console.log("open modal");
    setShowAcceptModal(true);
  };

  const closeModal = () => {
    setShowAcceptModal(false);
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
      setIsLoading(true);
      const items = await get16NFTs();
      const offers = await getOffers();

      setOffers(offers);
      setData(items);
      setFilteredData(items);

      setIsLoading(false);
    };
    getItems();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  else
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
          style={{ flexBasis: "21%" }}
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
                openModal={openModal}
                closeModal={closeModal}
              />
            );
          })}
        </Flex>
      </Box>
    );
};

export default Marketplace;
