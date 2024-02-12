import { Flex, Box } from "@radix-ui/themes";
import { useMarket } from "../web3hooks";
import {
  useSignAndExecuteTransactionBlock,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import SuiSymbol from "../../assets/sui-symbol.svg";
interface NFTCardProps {
  className: string;
  image: string;
  name: string;
  price: string;
  id: string;
}
const NFTCard = ({ className, image, name, price, id }: NFTCardProps) => {
  const { buyOffer } = useMarket();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const account = useCurrentAccount();
  const buy = () => {
    console.log(price);
    const tx = buyOffer(
      id,
      price,
      Array.from(account?.publicKey as Uint8Array),
    );
    signAndExecute(
      {
        transactionBlock: tx,
        requestType: "WaitForLocalExecution",
      },
      {
        onSuccess: () => {
          console.log("Success");
        },
        onError: (error) => {
          console.log(error);
        },
      },
    );
  };
  return (
    <>
      <Flex
        direction={"column"}
        align-items={"flex-start"}
        align-self={"stretch"}
        className={className}
        onClick={buy}
        style={{ cursor: "pointer" }}
      >
        <img src={image} alt={name} />
        <Box>{name}</Box>
        <Flex direction={"row"}>
          Price:{" "}
          <img
            src={SuiSymbol}
            style={{ height: "1em", width: "auto", margin: "5px" }}
          />{" "}
          {price.substring(0, price.length - 9)}
        </Flex>
      </Flex>
    </>
  );
};

export default NFTCard;
