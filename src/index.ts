import {
    KioskClient,
    KioskOwnerCap,
    KioskTransaction,
    Network,
  } from "@mysten/kiosk";
  import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
  import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
  import { TransactionBlock } from "@mysten/sui.js/transactions";
  import { sha256 } from "js-sha256";
  import { getKioskClient, getOwnedKiosk, getSuiClient } from "./account";

  const client = new SuiClient({url: "https://explorer-rpc.mainnet.sui.io:443"});

  let txb = new TransactionBlock();

  const kioskTx = new KioskTransaction({
    kioskClient: getKioskClient(),
    transactionBlock: txb,
    cap: await getOwnedKiosk(),
  });

  txb.moveCall({
    target: `${GAME_V2_PACKAGE_ID}::the_game::new_player`,
    arguments: [kioskTx.getKiosk(), kioskTx.getKioskCap(), txb.pure.u8(type)],
  });

  kioskTx.finalize();
  await signAndExecute(txb);