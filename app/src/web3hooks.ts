import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";

type Network = "mainnet" | "testnet" | "devnet" | "localnet";
interface listResponse {
  nft: string;
  price: string;
  seller: string;
}

const pkg = import.meta.env.VITE_PACKAGE_ID as string;
const marketplace = import.meta.env.VITE_MARKETPLACE as string;

export const useMarket = () => {
  const client = new SuiClient({
    url: getFullnodeUrl(import.meta.env.VITE_ACTIVE_NETWORK as Network),
  });

  // TODO:  Validate URL
  const list = (price: string, imgURL: string): TransactionBlock => {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${pkg}::private_nft_market::list`,
      arguments: [
        tx.object(marketplace),
        tx.pure.u64(price),
        tx.pure.string(imgURL),
      ],
    });

    return tx;
    // const response: any = client.signAndExecuteTransactionBlock({
    //     transactionBlock: tx,
    //     signer: keypair,
    //     options: {
    //         showEvents: true
    //     },
    //     requestType: "WaitForLocalExecution"
    // });
    // console.log(response);

    // return response.events[0].parsedJson as listResponse;
  };

  const buyOffer = (nft: string, price: string, publicKey: number[]) => {
    const tx = new TransactionBlock();
    const coin = tx.splitCoins(tx.gas, [tx.pure(price)]);
    tx.moveCall({
      target: `${pkg}::private_nft_market::buy_offer`,
      arguments: [
        tx.object(marketplace),
        tx.pure.id(nft),
        coin,
        tx.pure(publicKey),
      ],
    });

    return tx;
  };

  const acceptOffer = (nft: string, encMasterKey: number[]) => {
    const tx = new TransactionBlock();
    // [0.0.0] is a dummy proof vector for now
    tx.moveCall({
      target: `${pkg}::private_nft_market::accept_offer`,
      arguments: [
        tx.object(marketplace),
        tx.pure.id(nft),
        tx.pure([0, 0, 0]),
        tx.pure(encMasterKey),
      ],
    });

    return tx;
  };

  //TODE : Reads

  return { list, buyOffer, acceptOffer };
};
