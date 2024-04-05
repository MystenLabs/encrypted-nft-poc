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
  ephemeral: number[];
  ciphertext: number[];
  close: () => void;
}

const NFTPage = ({
  id,
  name,
  image,
  owner,
  cipherURL,
  ephemeral,
  ciphertext,
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
      body: JSON.stringify({
        owner: account?.address!,
        recipient: recipient,
        ephemeral: Buffer.from(ephemeral).toString("hex"),
        ciphertext: Buffer.from(ciphertext).toString("hex"),
      }),
    });
    const {
      proof,
      senderPublicKey,
      recipientPublicKey,
      prevEphemeral,
      prevCiphertext,
      newEphemeral,
      newCiphertext,
    } = await resp.json();

    const parsedProof = JSON.parse(proof);
    const tx = transferNFT(
      id,
      recipient,
      Array.from(Buffer.from(senderPublicKey, "hex")),
      Array.from(Buffer.from(recipientPublicKey, "hex")),
      Array.from(Buffer.from(prevEphemeral, "hex")),
      Array.from(Buffer.from(prevCiphertext, "hex")),
      Array.from(Buffer.from(newEphemeral, "hex")),
      Array.from(Buffer.from(newCiphertext, "hex")),
      Array.from(Buffer.from(parsedProof.s1, "hex")),
      Array.from(Buffer.from(parsedProof.s2, "hex")),
      Array.from(Buffer.from(parsedProof.u1, "hex")),
      Array.from(Buffer.from(parsedProof.u2, "hex")),
      Array.from(Buffer.from(parsedProof.v, "hex")),
    );
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
    const response = await fetch(backend + "deobfuscate", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({
        obfuscatedImageUrl: cipherURL.replace("_ciphertext", ""),
        cipherUrl: cipherURL,
        ephemeral: Buffer.from(ephemeral).toString("hex"),
        ciphertext: Buffer.from(ciphertext).toString("hex"),
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
        <Flex direction="column">
          <h3>{name}</h3>
          <h3>{owner}</h3>
          <Link
            href={`https://explorer.polymedia.app/object/${id}?network=${import.meta.env.VITE_ACTIVE_NETWORK}`}
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
      <Box>
      {deobfuscatedImage && <img src={deobfuscatedImage} alt={name}  style={{height: "auto"}}/>}
      </Box>
    </Flex>
  );
};

export default NFTPage;
