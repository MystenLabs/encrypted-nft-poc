import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";

/* TO DELETE:
Sample images:
https://iili.io/JcDET9R.png
https://iili.io/JcDEgDB.png
https://iili.io/JcDEbNp.png
*/
type Network = "mainnet" | "testnet" | "devnet" | "localnet";
export interface Listing {
  nft: string;
  price: string;
  seller: string;
  image: string
}


const pkg = import.meta.env.VITE_PACKAGE_ID as string;
const marketplace = import.meta.env.VITE_MARKETPLACE as string;
const listings = import.meta.env.VITE_LISTINGS_TABLE as string;

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

  const get16NFTs = async (cursor: string| null = null): Promise<Listing[]> => {
    const response: any = await client.getDynamicFields({
      parentId: listings,
      limit: 16,
      cursor
    });
    const keys = response.data.map((item: any) => {
      return item.name.value;
    });
    const items = [];
    for (let key of keys) {
      const item: any = await client.getDynamicFieldObject({
        parentId: listings,
        name: {
          value: key,
          type: "0x2::object::ID",
        },
      });
      const fields = item.data.content.fields.value.fields;
      items.push({
        seller: fields.seller as string,
        nft: fields.nft as string,
        image: fields.image as string,
        price: fields.price as string,
      });
    }
    return items;
  };

  return { list, buyOffer, acceptOffer, get16NFTs };
};
