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

    const nfts = response.data.map((item: any) => {
      const ret = item.data?.content.fields;
      ret.id = ret.id.id;
      ret.ephemeral = ret.encrypted_master_key.fields.ephemeral.fields.bytes;
      ret.ciphertext = ret.encrypted_master_key.fields.ciphertext.fields.bytes;
      return ret;
    });

    // nfts.forEach((nft: any) => {
    //   const ephemeral = nft.encryptedMasterKey.fields.ephemeral.fields.bytes;
    //   const ciphertext = nft.encryptedMasterKey.fields.ciphertext.fields.bytes;
    //   nft.ephemeral = ephemeral;
    //   nft.ciphertext = ciphertext;
    // });
    console.log(nfts, "looo");
    return nfts;
  };

  const createNFT = (
    name: string,
    image_url: string,
    cipher_url: string,
    ephemeral: string,
    ciphertext: string,
    user: string
  ) => {
    const tx = new TransactionBlock();
    
    console.log(Array.from(Buffer.from(ephemeral, 'hex')), Array.from(Buffer.from(ciphertext, 'hex')));
    const nft = tx.moveCall({
      target: `${pkg}::private_nft::new`,
      arguments: [
        tx.pure.string(name),
        tx.pure.string(image_url),
        tx.pure.string(cipher_url),
        tx.pure(Array.from(Buffer.from(ephemeral, 'hex'))),
        tx.pure(Array.from(Buffer.from(ciphertext, 'hex'))),
      ],
    });

    tx.transferObjects([nft], tx.pure.address(user));

    return tx;
  };

  const transferNFT = (
    nft: string,
    to: string,
    senderPublicKey: number[],
    receiverPublicKey: number[],
    prevEphemeral: number[],
    prevCiphertext: number[],
    newEphemeral: number[],
    newCiphertext: number[],
    proof_s1: number[],
    proof_s2: number[],
    proof_u1: number[],
    proof_u2: number[],
    proof_v: number[]
  ) => {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${pkg}::private_nft::transfer_to`,
      arguments: [
        tx.object(nft),
        tx.pure.address(to),
        tx.pure(senderPublicKey, "vector<u8>"),
        tx.pure(receiverPublicKey, "vector<u8>"),
        tx.pure(prevEphemeral, "vector<u8>"),
        tx.pure(prevCiphertext, "vector<u8>"),
        tx.pure(newEphemeral, "vector<u8>"),
        tx.pure(newCiphertext, "vector<u8>"),
        tx.pure(proof_s1, "vector<u8>"),
        tx.pure(proof_s2, "vector<u8>"),
        tx.pure(proof_u1, "vector<u8>"),
        tx.pure(proof_u2, "vector<u8>"),
        tx.pure(proof_v, "vector<u8>"),
      ],
    });

    return tx;
  }

  return {getOwnedNFTs, createNFT, transferNFT};
};
