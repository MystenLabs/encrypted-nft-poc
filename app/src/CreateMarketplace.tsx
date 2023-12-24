import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Button, Container } from "@radix-ui/themes";
import {
  useSignAndExecuteTransactionBlock,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";

export function CreateMarketplace({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const client = useSuiClient();
  const counterPackageId = useNetworkVariable("counterPackageId");
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  return (
    <Container>
      <Button
        size="3"
        onClick={() => {
          create();
        }}
      >
        Create Marketplace
      </Button>
    </Container>
  );

  function create() {
    const txb = new TransactionBlock();

    txb.moveCall({
      arguments: [],
      target: `${counterPackageId}::private_nft_market::create`,
    });

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
          client
            .waitForTransactionBlock({
              digest: tx.digest,
            })
            .then(() => {
              // obj[0] = marketplaceCap
              // obj[1] = marketplace 
              const objectId = tx.effects?.created?.[0]?.reference?.objectId;

              if (objectId) {
                onCreated(objectId);
              }
            });
        },
      },
    );
  }
}
