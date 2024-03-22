import { Button, Flex, Link, Box } from "@radix-ui/themes";
import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
import { useMarket } from "../web3hooks";
import { useState } from "react";

interface NFTPageProps {
  id: string;
  name: string;
  image: string;
  owner: string;
  cipherURL: string;
  secretKey: string;
  close: () => void;
}

const NFTPage = ({
  id,
  name,
  image,
  owner,
  cipherURL,
  secretKey,
  close,
}: NFTPageProps) => {
  const [recipient, setRecipient] = useState("");
  const [deobfuscatedImage, setDeobfuscatedImage] = useState("");
  const account = useCurrentAccount();
  const backend = import.meta.env.VITE_BACKEND as string;
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransactionBlock();
  const { transferNFT } = useMarket();

  const handleClick = async () => {
    const resp = await fetch(backend + "transfer_to", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ owner: account?.address!, recipient: recipient, encryptedMasterKey: secretKey}),
    });
    const { encryptedSecretKey } = await resp.json();
    const tx = transferNFT(id, recipient, Array.from(Buffer.from(encryptedSecretKey, 'hex')), [1, 2, 3, 4]);
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
  };

  const onDeobfuscateClick = async () => {
    console.log("TOOOYOOTO", secretKey, Array.isArray(secretKey));
    const response = await fetch(backend + "deobfuscate", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({
        obfuscatedImageUrl: cipherURL.replace("_ciphertext", ""),
        cipherUrl: cipherURL,
        encSecretKey: secretKey,
        seller: account?.address,
      }),
    });
    const data = await response.json();
    setDeobfuscatedImage(data.deobfuscatedImage);
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
        {deobfuscatedImage && <img src={deobfuscatedImage} alt={name} />}
        <Flex direction="column">
          <h3>{name}</h3>
          <h3>{owner}</h3>
          <Link
            href={`https://suiexplorer.com/object/${id}?network=${import.meta.env.VITE_ACTIVE_NETWORK}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer
          </Link>
          <Button onClick={onDeobfuscateClick}>Deobfuscate</Button>
          <Box style={{ padding: "10px" }}>
            <label> Recipient: </label>
            <input
              type="text"
              onChange={(e) => setRecipient(e.target.value)}
              value={recipient}
              style={{ margin: "5px" }}
            />
            <Button
              onClick={handleClick}
              style={{ backgroundColor: "#F50032", margin: "5px" }}
            >
              Transfer
            </Button>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default NFTPage;
