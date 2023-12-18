// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module counter::private_colletible_tests {
    use counter::private_collectible;
    use std::string;
    use sui::balance;

    #[test]
    /// Scenario: perform a transfer operation, and confirm that the request
    /// is well-formed.
    fun test_transfer_action() {
        let ctx = &mut test::ctx(@0x0);
        let marketplace = private_collectible::init(ctx);
        let nft = EncryptedNFT {
            image_url: string::utf8(vector[]),
            hash: string::utf8(vector[]), 
            price: balance::value(100)
        };
        let token = private_collectible::add_listings(marketplace, nft, ctx);
    }
}
