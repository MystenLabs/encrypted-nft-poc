// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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
//   import { GAME_V2_PACKAGE_ID, getExtension } from "./game_v2";
//   import { signAndExecute } from "./transactions";
  
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });
  
  const kioskClient = new KioskClient({
    client: client,
    network: Network.CUSTOM,
  });
  
  export function getSuiClient() {
    return client;
  }
  
  // returns the kiosk client.
  export function getKioskClient() {
    return kioskClient;
  }
  
  export function unsafe_getPrivateKey(email?: string) {
    const savedState = email || localStorage.getItem("email");
    if (!savedState) throw new Error("needs an email to proceed");
    const hash = sha256(savedState);
    return Ed25519Keypair.deriveKeypairFromSeed(hash);
  }
  
  // Gets the connected address.
  export function unsafe_getConnectedAddress(email?: string) {
    const savedState = email || localStorage.getItem("email");
    if (!savedState) throw new Error("needs an email to proceed");
    return unsafe_getPrivateKey(savedState).toSuiAddress();
  }
  
  // Returns the address owned kiosks.
  export async function getOwnedKiosk() {
    const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({
      address: unsafe_getConnectedAddress(),
    });
  
    if (kioskOwnerCaps.length === 0) {
      await createKioskAndInstallExtension();
      return getOwnedKiosk();
    }
  
    // const extension = await getExtension(kioskOwnerCaps[0].kioskId);
    // if (!extension) {
    //   await addExtensionToExistingKiosk(kioskOwnerCaps[0]);
    // }
    return kioskOwnerCaps[0];
  }
  
  async function createKioskAndInstallExtension() {
    let txb = new TransactionBlock();
    let kioskTx = new KioskTransaction({ transactionBlock: txb, kioskClient });
  
    kioskTx.create();
  
    txb.moveCall({
      target: `${GAME_V2_PACKAGE_ID}::the_game::add`,
      arguments: [kioskTx.getKiosk(), kioskTx.getKioskCap()],
    });
  
    kioskTx.shareAndTransferCap(unsafe_getConnectedAddress());
    kioskTx.finalize();
  
    await signAndExecute(txb);
  }
  
  async function addExtensionToExistingKiosk(cap: KioskOwnerCap) {
    const txb = new TransactionBlock();
    const kioskTx = new KioskTransaction({
      transactionBlock: txb,
      kioskClient,
      cap,
    });
    txb.moveCall({
      target: `${GAME_V2_PACKAGE_ID}::the_game::add`,
      arguments: [kioskTx.getKiosk(), kioskTx.getKioskCap()],
    });
  
    kioskTx.finalize();
    await signAndExecute(txb);
  }
  
  export async function signAndExecute(txb: TransactionBlock) {
    return getSuiClient().signAndExecuteTransactionBlock({
      transactionBlock: txb,
      signer: unsafe_getPrivateKey(),
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
  }
  
  export const GAME_V2_PACKAGE_ID: string =
  "0xbc50935f395840be759de782cb0bd026613e7fb23ab23223f82940b7e37062fb";
