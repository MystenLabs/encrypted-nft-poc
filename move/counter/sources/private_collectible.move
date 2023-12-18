// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The module that defines a private NFT marketplace that creator can list encrypted nft and its hash
module counter::private_nft_market {
    use sui::dynamic_field::{Self as df};
    use sui::bag::{Self, Bag};
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID, ID};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use std::string::String;
    use sui::transfer;
    use sui::event;

    const EItemLockedByOffer: u64 = 0;
    const EItemDoesNotExist: u64 = 1;
    const EProofNotVerified: u64 = 2;
    const ENotOwner: u64 = 3;

    // Marketplace -> Shared object
    struct Marketplace has key {
        id: UID,
        balance: Balance<SUI>,
        listings: Bag, // nft_id => e_nft
    }

    // marketplace cap that the creator has
    struct MarketplaceCap has key, store {
        id: UID, 
        for: ID // marketplace id
    }

    // the NFT type we're using. We can also make this generic but keeping this like this for simplicity.
    struct EncryptedNFT has key, store {
        id: UID,
        item_id: ID,
        image_url: String, // s3 or ipfs image url
        hash: String, // a hash of the image, can verify content at url == hash of the downloaded image
        price: Balance<SUI>,
    }

    // the NFT type we're using. We can also make this generic but keeping this like this for simplicity.
    struct EncryptedMasterKey has key, store {
        id: UID,
        item_id: ID,
        encrypted_master_key: vector<u8>,
        encrypted_for: address
    }

    // the DF key to attach an offer 
    struct PurchaseOffer has copy, store, drop {
        id: ID
    }

    // An Offer's metadata.
    struct Offer has store {
        buyer: address,
        payment: Balance<SUI>,
        pk: vector<u8>,
        item_id: ID // refers to the ID of EncryptedNFT
    }

    /// Event on whether the signature is verified
    struct OfferReceived has copy, drop {
        buyer: address,
        item_id: ID
    }

    /// Event on whether the signature is verified
    struct OfferCompleted has copy, drop {
        buyer: address,
        item_id: ID
    }

    /// Create the marketplace
    fun init(ctx: &mut TxContext) {
        transfer::share_object(Marketplace {
            id: object::new(ctx),
            balance: balance::zero(),
            listings: bag::new(ctx),
        })
    }

    // Figure out a way to add listings to our marketp  lace.
    public fun add_listing(marketplace: &mut Marketplace, nft: EncryptedNFT) {
        bag::add(&mut marketplace.listings, nft.item_id, nft);
    }

    // functionality for the buyer
    // ID = ID of the NFT I am putting an offer for.
    public fun init_offer(
        marketplace: &mut Marketplace, 
        item_id: ID, 
        payment: Balance<SUI>, 
        pk: vector<u8>, 
        ctx: &mut TxContext
    ) {
        // 1. TODO: check if NFT with that ID exists in the listings.
        // 2. TODO: Check if there's already a DF (offer) for that ID.
        // 3. TODO: IF there's price validation etc, also check that payment is at least that price.
        let buyer = tx_context::sender(ctx);
        df::add(&mut marketplace.id, PurchaseOffer { id: item_id }, Offer {
            buyer: buyer,
            payment, 
            pk,
            item_id,
        });
        event::emit(OfferReceived { buyer: buyer, item_id: item_id });
    }

    /// accept the offer as the creator
    public fun accept_offer(
        marketplace: &mut Marketplace, 
        cap: &MarketplaceCap, 
        item_id: ID,
        proof: vector<u8>,
        encrypted_master_key: EncryptedMasterKey,
    ) {
        assert!(has_access(marketplace, cap), ENotOwner);
        // remove the offer DF
        let Offer { buyer, payment, pk: _, item_id: _ }  = df::remove<PurchaseOffer, Offer>(&mut marketplace.id, PurchaseOffer { id: item_id });
        // if !verify_proof(proof, pk) { return error };
        let enft: EncryptedNFT = bag::remove(&mut marketplace.listings, item_id);
        balance::join(&mut marketplace.balance, payment);
        transfer::public_transfer(enft, buyer);
        transfer::public_transfer(encrypted_master_key, buyer);
        event::emit(OfferCompleted { buyer: buyer, item_id: item_id });
    }

    // // similar to accept_offer but we just return the `payment` to the `bidder`.
    // public fun reject_offer() {
    //     marketplace: &mut Marketplace, 
    //     _: &MarketplaceCap, 
    //     item_id: ID,
    //     proof: vector<u8>
    // } {
    //     assert!(item_id, 0);
    // }

    /// Check whether the `MarketplaceCap` matches the `Marketplace`.
    public fun has_access(marketplace: &mut Marketplace, cap: &MarketplaceCap): bool {
        object::id(marketplace) == cap.for
    }
}