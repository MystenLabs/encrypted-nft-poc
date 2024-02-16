import { Flex, Box, Tooltip, HoverCard, Text, Link} from "@radix-ui/themes";
import { useMarket } from "../web3hooks";
import {
  useSignAndExecuteTransactionBlock,
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
  openModal: (id: string, pk: number[]) => void;
  closeModal: () => void;
}
const NFTCard = ({
  image,
  name,
  price,
  id,
  seller,
  pk,
  openModal,
}: NFTCardProps) => {
  const { buyOffer, acceptOffer } = useMarket();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const account = useCurrentAccount();
  const showBorder = account?.address === seller && pk.length > 0;
  const buy = () => {
    if (showBorder) {
      // accepting offer
      openModal(id, pk);
    } else {
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
    }
  };
  return (
      <Flex
        direction={"column"}
        align-items={"flex-start"}
        align-self={"stretch"}
        className="nft-card"
        onClick={buy}
        style={{
          cursor: "pointer",
          border: showBorder ? "4px solid #d40551" : " 0px solid transparent",
          margin: "5px",
        }}
      >
        <HoverCard.Root>
          <HoverCard.Trigger>
            <img src={image} alt={name} />
          </HoverCard.Trigger>
          <HoverCard.Content>
            <Flex>
              <Link href={`https://suiexplorer.com/object/${id}?network=${import.meta.env.VITE_ACTIVE_NETWORK}`}>{id}</Link>
            </Flex>
          </HoverCard.Content>
        </HoverCard.Root>
        <Box>{name}</Box>
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
