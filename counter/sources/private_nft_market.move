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
    use sui::bls12381;
    use sui::group_ops::{Self, Element};
    use std::vector;
    use sui::hash::blake2b256;

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
        encrypted_master_key: ElGamalEncryption
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

    // Basic sigma protocol for proving equality of two ElGamal encryptions.
    // See https://crypto.stackexchange.com/questions/30010/is-there-a-way-to-prove-equality-of-plaintext-that-was-encrypted-using-different
    // same as pub struct EqualityProof in rust CLI. 
    struct EqualityProof has drop, store {
        s1: Element<bls12381::Scalar>,
        s2: Element<bls12381::Scalar>,
        u1: Element<bls12381::G1>,
        u2: Element<bls12381::G1>,
        v: Element<bls12381::G1>,
    }

    // An encryption of group element m under pk is (r*G, r*pk + m) for random r.
    struct ElGamalEncryption has drop, store {
        ephemeral: Element<bls12381::G1>,
        ciphertext: Element<bls12381::G1>,
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

    /// Create and share a Marketplace object.
    public fun create(ctx: &mut TxContext) {
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
    public fun add_listing(marketplace: &mut Marketplace, cap: &MarketplaceCap, price: u64, image_url: String, ctx: &mut TxContext) {
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
    public fun accept_offer(
        marketplace: &mut Marketplace, 
        cap: &MarketplaceCap, 
        item_id: ID,
        prev_enc_msk: &ElGamalEncryption,
        curr_enc_msk: ElGamalEncryption,
        seller_pk: &Element<bls12381::G1>,
        buyer_pk: &Element<bls12381::G1>,
        proof: &EqualityProof,
        ctx: &mut TxContext
    ) {
        assert!(has_access(marketplace, cap), ENotOwner);

        equility_verify(
            seller_pk,
            buyer_pk,
            prev_enc_msk, 
            &curr_enc_msk, 
            proof
        );
        // remove the offer DF
        let Offer { buyer, payment, pk: _, item_id: _ }  = df::remove<PurchaseOffer, Offer>(&mut marketplace.id, PurchaseOffer { id: item_id });

        let enft: EncryptedNFT = bag::remove(&mut marketplace.listings, item_id);
        let enc_mk = EncryptedMasterKey {
            id: object::new(ctx),
            item_id: item_id,
            encrypted_master_key: curr_enc_msk
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

    fun equility_verify(
        pk1: &Element<bls12381::G1>,
        pk2: &Element<bls12381::G1>,
        enc1: &ElGamalEncryption,
        enc2: &ElGamalEncryption,
        proof: &EqualityProof
    ): bool {
        let c = fiat_shamir_challenge(pk1, pk2, enc1, enc2, &proof.u1, &proof.u2, &proof.v);
        // Check if z1*G = a1 + c*pk1
        let lhs = bls12381::g1_mul(&proof.s1, &bls12381::g1_generator());
        let pk1_c = bls12381::g1_mul(&c, pk1);
        let rhs = bls12381::g1_add(&proof.u1, &pk1_c);
        if (!group_ops::equal(&lhs, &rhs)) {
            return false
        };
        // Check if z2*G = a2 + c*eph2
        let lhs = bls12381::g1_mul(&proof.s2, &bls12381::g1_generator());
        let eph2_c = bls12381::g1_mul(&c, &enc2.ephemeral);
        let rhs = bls12381::g1_add(&proof.u2, &eph2_c);
        if (!group_ops::equal(&lhs, &rhs)) {
            return false
        };
        // Check if a3 = c*(ct2 - ct1) + z1*eph1 - z2*pk2
        let scalars = vector::singleton(c);
        vector::push_back(&mut scalars, bls12381::scalar_neg(&c));
        vector::push_back(&mut scalars, proof.s1);
        vector::push_back(&mut scalars, bls12381::scalar_neg(&proof.s2));
        let points = vector::singleton(enc2.ciphertext);
        vector::push_back(&mut points, enc1.ciphertext);
        vector::push_back(&mut points, enc1.ephemeral);
        vector::push_back(&mut points, *pk2);
        let lhs = bls12381::g1_multi_scalar_multiplication(&scalars, &points);
        if (!group_ops::equal(&lhs, &proof.v)) {
            return false
        };

        return true
    }

    public fun fiat_shamir_challenge(
        pk1: &Element<bls12381::G1>,
        pk2: &Element<bls12381::G1>,
        enc1: &ElGamalEncryption,
        enc2: &ElGamalEncryption,
        a1: &Element<bls12381::G1>,
        a2: &Element<bls12381::G1>,
        a3: &Element<bls12381::G1>,
    ): Element<bls12381::Scalar> {
        let to_hash = vector::empty<u8>();
        vector::append(&mut to_hash, *group_ops::bytes(pk1));
        vector::append(&mut to_hash, *group_ops::bytes(pk2));
        vector::append(&mut to_hash, *group_ops::bytes(&enc1.ephemeral));
        vector::append(&mut to_hash, *group_ops::bytes(&enc1.ciphertext));
        vector::append(&mut to_hash, *group_ops::bytes(&enc2.ephemeral));
        vector::append(&mut to_hash, *group_ops::bytes(&enc2.ciphertext));
        vector::append(&mut to_hash, *group_ops::bytes(a1));
        vector::append(&mut to_hash, *group_ops::bytes(a2));
        vector::append(&mut to_hash, *group_ops::bytes(a3));
        let hash = blake2b256(&to_hash);
        // Make sure we are in the right field. Note that for security we only need the lower 128 bits.
        let len = vector::length(&hash);
        *vector::borrow_mut(&mut hash, len-1) = 0;
        bls12381::scalar_from_bytes(&hash)
    }
}