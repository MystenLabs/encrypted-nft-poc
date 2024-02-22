// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module counter::private_colletible_tests {
    use counter::private_nft_market::{Self, EncryptedNFT, equility_verify};
    use std::string;
    use sui::test_scenario as ts;
    use sui::object;

    #[test]
    /// Test a proof produced from CLI in move. 
    fun test_verify_proof_serialized_from_cli() {
        let sender = @0x0;
        let scenario = ts::begin(sender);
        let uid1 = ts::new_object(&mut scenario);
        // let pk1 = b"";
        // assert!(equility_verify(&pk1, &pk2, &enc1, enc2, &proof), 0);

    }
}
