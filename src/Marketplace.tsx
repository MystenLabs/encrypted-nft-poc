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
        arguments: [txb.object(id), txb.pure.u64(0)],
        target: `${counterPackageId}::private_nft_market::add_listing`,
      });
    } else if (method === "init_offer") {
      txb.moveCall({
        arguments: [txb.object(id), txb.pure.u64(0)],
        target: `${counterPackageId}::private_nft_market::init_offer`,
      });
    } else {
      txb.moveCall({
        arguments: [txb.object(id)],
        target: `${counterPackageId}::private_nft_market::accept_offer`,
      });
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

  const ownedByCurrentAccount =
  getMarketplace(data.data)?.owner === currentAccount?.address;

  return (
    <>
      <Heading size="3">Marketplace ID {id}</Heading>

      <Flex direction="column" gap="2">
        <Text>Marketplace: {getMarketplace(data.data)?.listings}</Text>
        <Flex direction="row" gap="2">
          {ownedByCurrentAccount ? (
            <Button onClick={() => executeMoveCall("accept_offer")}> Accept Offer </Button>
          ) : null}
          {ownedByCurrentAccount ? (
            <Button onClick={() => executeMoveCall("add_listing")}> Add Listing </Button>
          ) : null}

        </Flex>
        <Button onClick={() => executeMoveCall("init_offer")}> Submit to Buy </Button>
      </Flex>
    </>
  );
}

function getMarketplace(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }
  console.log(data.content.fields);
  return data.content.fields as { id: string, balance: number; owner: string; listings: string[]; };
}