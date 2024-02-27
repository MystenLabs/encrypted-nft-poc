import { Button, Flex, Link } from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
import { useMarket } from "../web3hooks";

interface NFTPageProps {
  id: string;
  name: string;
  image: string;
  price: string;
  seller: string;
  buyer: string;
  isOffer: boolean;
  secretKey: string;
  close: () => void;
}

const NFTPage = ({
  id,
  name,
  image,
  price,
  seller,
  buyer,
  secretKey,
  isOffer,
  close,
}: NFTPageProps) => {
  const account = useCurrentAccount();
  const backend = import.meta.env.VITE_BACKEND as string;
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransactionBlock();
  const { buyOffer, acceptOffer } = useMarket();

  const handleClick = async () => {
    console.log(account?.address);
    if (isOffer && account?.address === seller) {
      console.log(secretKey);
      const response = await fetch(backend + "accept", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          seller,
          buyer: account?.address,
          encryptedSecretKey: secretKey,
        }),
      });
      const { secretKey: newSecretKey } = await response.json();
      console.log(newSecretKey);
      const tx = acceptOffer(id, newSecretKey);
      await signAndExecute(
        {
          transactionBlock: tx,
          requestType: "WaitForLocalExecution",
        },
        {
          onError: (error) => {
            console.log(error);
          },
          onSuccess: () => {
            console.log("Accept Success");
          },
        },
      );
      close();
    } else {
      const resp = await fetch(backend + "public_key", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ buyer: account?.address! }),
      });
      const { publicKey } = await resp.json();
      const tx = buyOffer(id, price, publicKey);
      await signAndExecute(
        {
          transactionBlock: tx,
          requestType: "WaitForLocalExecution",
        },
        {
          onError: (error) => {
            console.log(error);
          },
          onSuccess: () => {
            console.log("Offer Success");
          },
        },
      );
      close();
    }
  };

  return (
    <Flex direction="column">
      <Flex direction="row">
        <Button
          onClick={() => {
            close();
          }}
        >
          Back
        </Button>
        <h2>Asset Preview</h2>
      </Flex>
      <Flex direction="row">
        <img src={image} alt={name} />
        <Flex direction="column">
          <h3>{name}</h3>
          <h3>{price}</h3>
          <h3>{seller}</h3>
          <Link
            href={`https://suiexplorer.com/object/${id}?network=${import.meta.env.VITE_ACTIVE_NETWORK}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer
          </Link>
          <Button onClick={handleClick} style={{ backgroundColor: "#F50032" }}>
            {isOffer && account?.address === seller ? "Accept Offer" : "Buy"}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default NFTPage;
