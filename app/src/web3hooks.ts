import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";

type Network = "mainnet" | "testnet" | "devnet" | "localnet";

const pkg = import.meta.env.VITE_PACKAGE_ID as string;

export const useMarket = () => {
  const client = new SuiClient({
    url: getFullnodeUrl(import.meta.env.VITE_ACTIVE_NETWORK as Network),
  });

  const getOwnedNFTs = async (address: string) => {
    const response = await client.getOwnedObjects({
      owner: address,
      options: {
        showContent: true,
        showType: true,
      },
      filter: {
        StructType: `${pkg}::private_nft::EncryptedNFT`,
      }
    });
    console.log(response);
    return response.data.map((item: any) => {
      const ret = item.data?.content.fields;
      ret.id = ret.id.id;
      return ret;
    });
  };

  const createNFT = (
    name: string,
    image_url: string,
    cipher_url: string,
    encryptedMasterKey: number[],
    proof: number[],
    user: string
  ) => {
    const tx = new TransactionBlock();

    const nft = tx.moveCall({
      target: `${pkg}::private_nft::new`,
      arguments: [
        tx.pure.string(name),
        tx.pure.string(image_url),
        tx.pure.string(cipher_url),
        tx.pure(encryptedMasterKey),
        tx.pure(proof),
      ],
    });

    tx.transferObjects([nft], tx.pure.address(user));

    return tx;
  };

  const transferNFT = (nft: string, to: string, encryptedMasterKey: number[], proof: number[]) => {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${pkg}::private_nft::transfer_to`,
      arguments: [tx.object(nft), tx.pure.address(to), tx.pure(encryptedMasterKey), tx.pure(proof)],
    });

    return tx;
  }

  return {getOwnedNFTs, createNFT, transferNFT};
};
