// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The module that defines a private NFT marketplace that creator can list encrypted nft and its hash
module counter::private_nft_market {
    use sui::dynamic_field::{Self as df};
    use sui::bag::{Self, Bag};
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID, ID};
    use sui::coin::{Self, Coin, join};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use std::string::String;
    use sui::transfer;
    use sui::event;

    const EItemLockedByOffer: u64 = 0;
    const EItemDoesNotExist: u64 = 1;
    const EProofNotVerified: u64 = 2;
    const ENotOwner: u64 = 3;
    const EOfferNotEnough: u64 = 4;

    // Marketplace -> Shared object
    struct Marketplace has key {
        id: UID,
        balance: Balance<SUI>,
        listings: Bag, // item_id => e_nft
        owner: address
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
        image_url: String, // s3 or ipfs image url, todo: use metadata with display
        price: u64,
    }

    // the NFT type we're using. We can also make this generic but keeping this like this for simplicity.
    struct EncryptedMasterKey has key, store {
        id: UID,
        item_id: ID,
        encrypted_master_key: vector<u8>
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

    // // Basic sigma protocol for proving equality of two ElGamal encryptions.
    // // See https://crypto.stackexchange.com/questions/30010/is-there-a-way-to-prove-equality-of-plaintext-that-was-encrypted-using-different
    // struct EqualityProof has drop, store {
    //     a1: Element<ristretto255::G>,
    //     a2: Element<ristretto255::G>,
    //     a3: Element<ristretto255::G>,
    //     z1: Element<ristretto255::Scalar>,
    //     z2: Element<ristretto255::Scalar>,
    // }

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

    /// Create and share a Marketplace object.
    public entry fun create(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            balance: balance::zero(),
            listings: bag::new(ctx),
            owner: tx_context::sender(ctx),
        };
        
        let cap = MarketplaceCap {
            id: object::new(ctx),
            for: object::id(&marketplace)
        };

        transfer::share_object(marketplace);
        sui::transfer::transfer(cap, tx_context::sender(ctx));
    }

    // Figure out a way to add listings to our marketplace.
    public entry fun add_listing(marketplace: &mut Marketplace, cap: &MarketplaceCap, price: u64, image_url: String, ctx: &mut TxContext) {
        assert!(has_access(marketplace, cap), ENotOwner);
        let id = object::new(ctx);
        let item_id = object::uid_to_inner(&id);
        let nft = EncryptedNFT {
            id: id,
            item_id: item_id,
            image_url: image_url,
            price: price,
        };
        // todo(george): maybe im using the bag wrong?
        bag::add(&mut marketplace.listings, nft.item_id, nft);
    }

    // functionality for the buyer
    // ID = ID of the NFT I am putting an offer for.
    public entry fun init_offer(
        marketplace: &mut Marketplace, 
        item_id: ID, 
        payment: Coin<SUI>, 
        pk: vector<u8>, 
        ctx: &mut TxContext
    ) {
        assert!(bag::contains(&marketplace.listings, item_id), EItemDoesNotExist);
        let item: &EncryptedNFT = bag::borrow(&marketplace.listings, item_id);
        let buyer = tx_context::sender(ctx);

        let pmt = coin::into_balance(payment);
        assert!(balance::value(&pmt) >= item.price, EOfferNotEnough);

        // 2. TODO: Check if there's already a DF (offer) for that ID.

        df::add(&mut marketplace.id, PurchaseOffer { id: item_id }, Offer {
            buyer: buyer,
            payment: pmt, 
            pk,
            item_id,
        });
        event::emit(OfferReceived { buyer: buyer, item_id: item_id });
    }

    /// accept the offer as the creator
    public entry fun accept_offer(
        marketplace: &mut Marketplace, 
        cap: &MarketplaceCap, 
        item_id: ID,
        proof: vector<u8>,
        // proof: EqualityProof,
        encrypted_master_key: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(has_access(marketplace, cap), ENotOwner);
        // remove the offer DF
        let Offer { buyer, payment, pk: _, item_id: _ }  = df::remove<PurchaseOffer, Offer>(&mut marketplace.id, PurchaseOffer { id: item_id });

        // equility_verify(&pk1, &pk2, &enc1, &enc2, &proof);
        // pub struct ConsistencyProof<ScalarType, G1Element> {
        // pub s1: ScalarType,
        // pub s2: ScalarType,
        // pub u1: G1Element,
        // pub u2: G1Element,
        // pub v: G1Element,
        // }

        let enft: EncryptedNFT = bag::remove(&mut marketplace.listings, item_id);
        let enc_mk = EncryptedMasterKey {
            id: object::new(ctx),
            item_id: item_id,
            encrypted_master_key: encrypted_master_key
        };

        balance::join(&mut marketplace.balance, payment);
        transfer::public_transfer(enft, buyer);
        transfer::public_transfer(enc_mk, buyer);
        event::emit(OfferCompleted { buyer: buyer, item_id: item_id });
    }
    // todo: resell flow
    
    // // similar to accept_offer but we just return the `payment` to the `bidder`.
    // public fun cancel_offer() {
    //     marketplace: &mut Marketplace, 
    //     _: &MarketplaceCap, 
    //     item_id: ID,
    //     proof: vector<u8>
    // } {
    //     assert!(item_id, 0);
    // }

    /// Check whether the `MarketplaceCap` matches the `Marketplace`.
    public entry fun has_access(marketplace: &mut Marketplace, cap: &MarketplaceCap): bool {
        object::id(marketplace) == cap.for
    }
}