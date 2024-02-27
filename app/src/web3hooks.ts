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
  image: string;
  name: string;
  id: string;
  secretKey: string;
}

export interface Offers {
  [key: string]: {
    buyer: string;
    pk: number[];
  };
}

const pkg = import.meta.env.VITE_PACKAGE_ID as string;
const marketplace = import.meta.env.VITE_MARKETPLACE as string;
const listings = import.meta.env.VITE_LISTINGS_TABLE as string;
const offers = import.meta.env.VITE_OFFERS_TABLE as string;

export const useMarket = () => {
  const client = new SuiClient({
    url: getFullnodeUrl(import.meta.env.VITE_ACTIVE_NETWORK as Network),
  });

  // TODO:  Validate URL
  const list = (
    price: string,
    imgURL: string,
    name: string,
    ciphertextURL: string,
    secretKey: ArrayLike<number>,
  ): TransactionBlock => {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${pkg}::private_nft_market::list`,
      arguments: [
        tx.object(marketplace),
        tx.pure.u64(price),
        tx.pure.string(imgURL),
        tx.pure.string(ciphertextURL),
        tx.pure(secretKey),
        tx.pure.string(name),
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

  const get16NFTs = async (
    cursor: string | null = null,
  ): Promise<Listing[]> => {
    const response: any = await client.getDynamicFields({
      parentId: listings,
      limit: 16,
      cursor,
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
      console.log(fields);
      const hexKey = Buffer.from(fields.secret_key);
      items.push({
        seller: fields.seller as string,
        nft: fields.nft as string,
        image: fields.image as string,
        price: fields.price as string,
        name: fields.name as string,
        secretKey: hexKey.toString('hex'),
        id: key,
      });
    }
    return items;
  };

  // Getting all the offers won't work in production environments
  const getOffers = async () => {
    const response: any = await client.getDynamicFields({
      parentId: offers,
    });
    const keys = response.data.map((item: any) => {
      return item.name.value;
    });
    const items: Offers = {};
    for (let key of keys) {
      const item: any = await client.getDynamicFieldObject({
        parentId: offers,
        name: {
          value: key,
          type: "0x2::object::ID",
        },
      });
      const fields = item.data.content.fields.value.fields;
      items[key] = {
        buyer: fields.buyer as string,
        pk: fields.pk as number[],
      };
    }
    return items;
  };

  return { list, buyOffer, acceptOffer, get16NFTs, getOffers };
};
