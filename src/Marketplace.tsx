import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { SuiObjectData } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";

export function Marketplace({ id }: { id: string }) {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const counterPackageId = useNetworkVariable("counterPackageId");
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const executeMoveCall = (method: "add_listing" | "init_offer" | "accept_offer") => {
    const txb = new TransactionBlock();

    if (method === "add_listing") {
      txb.moveCall({
        arguments: [
          txb.object(
            "0x7749d94a18d52ef195f2e4b009ab2a0a95afc1faacbcdd2e4bbd55be40f1b849"
          ), // marketplace id
          txb.object("0xa305785371be65b571f7ab255cec5710daa31395ca758344bbc7469058f6d1ff"), // cap id
          txb.pure(123), txb.pure("test")],
        target: `${counterPackageId}::private_nft_market::add_listing`,
      });
    } else if (method === "init_offer") {
      // todo(george): to check how to split coin
      txb.moveCall({
        arguments: [txb.object(
          "0x7749d94a18d52ef195f2e4b009ab2a0a95afc1faacbcdd2e4bbd55be40f1b849"
        ), // marketplace id
        txb.object(
          "0x5237c0f910e5c4f1f32a70256128a5b93998d755236d03c2b9b092ecf8b83b84"
        ), // item id 
        txb.object("0x15bcda9e23dd81b16e723f4250b563ba57e6a2a620ce2debbc9ba5e7cfed89fc"), // coin id
        txb.pure([1, 1, 1], "vector<u8>")],
        typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
        target: `${counterPackageId}::private_nft_market::init_offer`,
      });
    } else {
      txb.moveCall({
        arguments: [
          txb.object("0x7749d94a18d52ef195f2e4b009ab2a0a95afc1faacbcdd2e4bbd55be40f1b849"), // marketplace id
          txb.object("0xa305785371be65b571f7ab255cec5710daa31395ca758344bbc7469058f6d1ff"), // cap id
          txb.object("0x5237c0f910e5c4f1f32a70256128a5b93998d755236d03c2b9b092ecf8b83b84"), // item id
          txb.pure([1, 1, 1], "vector<u8>"), // proof
          txb.pure([1], "vector<u8>"), // encrypted master key
      ],
        target: `${counterPackageId}::private_nft_market::accept_offer`,
      });
      console.log("accept_offer!, ", txb.serialize());
    }

    signAndExecute(
      {
        transactionBlock: txb,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: (tx) => {
          client.waitForTransactionBlock({ digest: tx.digest }).then(() => {
            refetch();
          });
        },
      },
    );
  };

  if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>Error: {error.message}</Text>;

  if (!data.data) return <Text>Not found</Text>;

  const ownedByCurrentAccount = getCap(data.data)?.for === currentAccount?.address;

  return (
    <>
      <Heading size="3">Marketplace ID {getCap(data.data)?.for}</Heading>

      <Flex direction="column" gap="2">
        {/* <Text>Marketplace: {getCap(data.data)?.for}</Text> */}
        <Flex direction="row" gap="2">
          {ownedByCurrentAccount ? (
            <Button onClick={() => executeMoveCall("accept_offer")}> Accept Offer </Button>
          ) : null}
          {ownedByCurrentAccount ? (
            <Button onClick={() => executeMoveCall("add_listing")}> Add Listing </Button>
          ) : null}
          <Button onClick={() => executeMoveCall("add_listing")}> Add Listing </Button>
          <Button onClick={() => executeMoveCall("accept_offer")}> Accept Offer </Button>
          <Button onClick={() => executeMoveCall("init_offer")}> Submit to Buy </Button>
        </Flex>        
      </Flex>
    </>
  );
}

// function getMarketplace(data: SuiObjectData) {
//   if (data.content?.dataType !== "moveObject") {
//     return null;
//   }
//   let g = data.content.fields as { id: string, for: string };

//   let s = data1?.data?.content.fields as { balance: number, id: {id: string}, listings: string[], owner: string };
//   console.log("getMarketplace tktk", s.balance, s.id, s.listings, s.owner);
//   console.log("getMarketplace s", data1?.data?.content.fields);

//   return data.content.fields as { balance: number, id: string, listings: string[], owner: string };
// }

function getCap(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }
  // let s = data.content.fields as { id: string, for: string };
  // console.log("getCap tktk", s);
  return data.content.fields as { id: string, for: string };
}
