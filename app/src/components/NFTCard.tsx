import { Flex, Box, Link} from "@radix-ui/themes";
import {
  useCurrentAccount,
} from "@mysten/dapp-kit";
import "../styles/tooltip.css";
import SuiSymbol from "../../assets/sui-symbol.svg";
interface NFTCardProps {
  image: string;
  name: string;
  price: string;
  id: string;
  seller: string;
  pk: number[];
  index: number;
  openNFTPage: (index: number) => void;
}
const NFTCard = ({
  image,
  name,
  price,
  id,
  seller,
  pk,
  index,
  openNFTPage,
}: NFTCardProps) => {
  // const { buyOffer, acceptOffer } = useMarket();
  // const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const account = useCurrentAccount();
  const showBorder = account?.address === seller && pk.length > 0;
  const clicked = () => {
    openNFTPage(index);
    // if (showBorder) {
    //   // accepting offer
      
    // } else {
    //   const tx = buyOffer(
    //     id,
    //     price,
    //     Array.from(account?.publicKey as Uint8Array),
    //   );
    //   signAndExecute(
    //     {
    //       transactionBlock: tx,
    //       requestType: "WaitForLocalExecution",
    //     },
    //     {
    //       onSuccess: () => {
    //         console.log("Success");
    //       },
    //       onError: (error) => {
    //         console.log(error);
    //       },
    //     },
    //   );
    // }
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
          border: showBorder ? "4px solid #d40551" : " 0px solid transparent",
          margin: "5px",
        }}
      >
        <img src={image} alt={name} />
        <Flex direction={"row"}>
          Price:{" "}
          <img
            src={SuiSymbol}
            style={{ height: "1em", width: "auto", margin: "5px" }}
          />
          {price.substring(0, price.length - 9)}
        </Flex>
      </Flex>
  );
};

export default NFTCard;
