// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
module marketplace::offer {
    /// A offer that can be active, expired, or fulfilled. 
    struct Offer has store, drop { 
        purchase_cap_id: ID,
        pk: vector<u8>,
    }

    /// Create a new Offer.
    public(friend) fun new(
        kiosk: ID,
        pk: vector<u8>,
        _ctx: &mut TxContext
    ): Offer {
        Offer {
            kiosk,
            pk
        }
    }
}