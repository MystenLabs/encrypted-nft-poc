// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl } from "@mysten/sui.js/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    testnet: {
      url: getFullnodeUrl(import.meta.env.VITE_ACTIVE_NETWORK),
      variables: {
        counterPackageId: import.meta.env.VITE_PACKAGE_ID as string,
      },
    },
    // mainnet: {
    //   url: getFullnodeUrl("mainnet"),
    //   variables: {
    //     counterPackageId: MAINNET_COUNTER_PACKAGE_ID,
    //   },
    // },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };