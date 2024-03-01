// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The module that defines a private NFT marketplace that creator can list encrypted nft and its hash
module marketplace::private_nft_market {

    use sui::coin::{Self, Coin};
    use sui::dynamic_object_field as dof;
    use sui::event;
    use sui::object::{Self, UID, ID};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::bls12381;
    use sui::group_ops::{Self, Element};
    use std::vector;
    use sui::bcs;
    use sui::hash::blake2b256;

    use std::string::String;

    const EItemNotListed: u64 = 1;
    const EProofNotVerified: u64 = 2;
    const EIncorrectPrice: u64 = 3;
    const ENotYourListing: u64 = 4;
    const ENotYourOffer: u64 = 5;
    const ENoOfferForItem: u64 = 6;
    const EAnOfferAlreadyExists: u64 = 7;


    // Marketplace -> Shared object
    struct Marketplace has key {
        id: UID,
        total_listings: u64,
        listings: Table<ID, Listing>,
        offers: Table<ID, Offer>,
    }

    /// Used as value for the table that tracks the listings.
    struct Listing has store {
        nft: ID,
        price: u64,
        seller: address,
        image: String,
        name: String,
        secret_key: ElGamalEncryption
    }
    

    // the NFT type we're using. We can also make this generic but keeping this like this for simplicity.
    struct EncryptedNFT has key, store {
        id: UID,
        name: String,
        image_url: String, // s3 or ipfs image url, todo: use metadata with display
        ciphertext_url: String,
        price: u64,
        encrypted_master_key: ElGamalEncryption
    }

    /// Represents the intent of a buyer to purchase.
    /// Contains the public key of the buyer.
    struct Offer has store {
        buyer: address,
        payment: Coin<SUI>,
        pk: vector<u8>,
        nft: ID // refers to the ID of EncryptedNFT
    }

    // Basic sigma protocol for proving equality of two ElGamal encryptions.
    // See https://crypto.stackexchange.com/questions/30010/is-there-a-way-to-prove-equality-of-plaintext-that-was-encrypted-using-different
    // same as pub struct EqualityProof in rust CLI. 
    struct EqualityProof has drop, store {
        s1: Element<bls12381::Scalar>, // z1
        s2: Element<bls12381::Scalar>, // z2
        u1: Element<bls12381::G1>, // a1
        u2: Element<bls12381::G1>, // a2
        v: Element<bls12381::G1>, // a3
    }

    // An encryption of group element m under pk is (r*G, r*pk + m) for random r.
    struct ElGamalEncryption has drop, copy, store {
        ephemeral: Element<bls12381::G1>,
        ciphertext: Element<bls12381::G1>,
    }

    // Events

    // Added the image here to make things easier for the backend.
    /// Emitted on each new list.
    struct ItemListed has copy, drop {
        nft: ID,
        price: u64,
        seller: address,
    }

    /// Event on whether the signature is verified
    struct OfferReceived has copy, drop {
        buyer: address,
        nft: ID
    }

    /// Event on whether the signature is verified
    struct OfferCompleted has copy, drop {
        buyer: address,
        nft: ID
    }

    // Functions    

    // The following is insecure since the nonce is small, but in practice it should be a random scalar.
    #[test_only]
    public fun insecure_elgamal_encrypt(
        pk: &Element<bls12381::G1>,
        r: u64,
        m: &Element<bls12381::G1>
    ): ElGamalEncryption {
        let r = bls12381::scalar_from_u64(r);
        let ephemeral = bls12381::g1_mul(&r, &bls12381::g1_generator());
        let pk_r  = bls12381::g1_mul(&r, pk);
        let ciphertext = bls12381::g1_add(m, &pk_r);
        ElGamalEncryption { ephemeral, ciphertext }
    }

    /// Create and share a Marketplace object.
   fun init(ctx: &mut TxContext) {
        let marketplace_id = object::new(ctx);
        let marketplace = Marketplace {
            id: marketplace_id ,
            total_listings: 0,
            listings: table::new<ID, Listing>(ctx),
            offers: table::new<ID, Offer>(ctx)
        };

        transfer::share_object(marketplace);
    }

    // Called by the seller or creator.
    public fun list(
        marketplace: &mut Marketplace,
        price: u64,
        image_url: String,
        ciphertext_url: String,
        encrypted_master_key: ElGamalEncryption,
        name: String,
        ctx: &mut TxContext)
    {
    
        let id = object::new(ctx);
        let item_id = object::uid_to_inner(&id);
        let nft = EncryptedNFT {
            id,
            name,
            image_url,
            ciphertext_url,
            price: price,
            encrypted_master_key,
        };
        let seller: address = tx_context::sender(ctx);
        table::add<ID, Listing>(&mut marketplace.listings, item_id,
            Listing {
                nft: item_id,
                price,
                seller,
                image: image_url,
                name,
                secret_key: encrypted_master_key
            }
        );
        dof::add<ID, EncryptedNFT>(&mut marketplace.id, item_id, nft);
        marketplace.total_listings = marketplace.total_listings + 1;

        event::emit(ItemListed{
            nft: item_id,
            price,
            seller,
        });
    }

    
    /// Called by the buyer.
    public entry fun buy_offer(
        marketplace: &mut Marketplace, 
        nft: ID, 
        payment: Coin<SUI>, 
        pk: vector<u8>, 
        ctx: &mut TxContext
    ) {
        assert!(table::contains<ID, Listing>(&marketplace.listings, nft), EItemNotListed);
        // For now multiple offers are not possible.
        assert!(!table::contains<ID, Offer>(&marketplace.offers, nft), EAnOfferAlreadyExists);
        let listing = table::borrow<ID, Listing>(&marketplace.listings, nft);
        assert!(coin::value(&payment) == listing.price, EIncorrectPrice);
        // Design decision:
        // Here we should check if the public key corresponds to address.
        // This will require the user to provide the flag.

        let buyer = tx_context::sender(ctx);
        table::add<ID, Offer>(&mut marketplace.offers, nft, Offer{
            buyer,
            payment,
            pk,
            nft
        });

        event::emit(OfferReceived { buyer, nft });
    }

    /// Called by seller to accept the offer.
    public fun accept_offer(
        marketplace: &mut Marketplace, 
        nft: ID,
        prev_enc_msk: &ElGamalEncryption,
        curr_enc_msk: ElGamalEncryption,
        seller_pk: &Element<bls12381::G1>,
        buyer_pk: &Element<bls12381::G1>,
        proof: &EqualityProof,
        ctx: &mut TxContext
    ) {
        assert!(table::contains<ID, Listing>(&marketplace.listings, nft), EItemNotListed);
        assert!(table::contains<ID, Offer>(&marketplace.offers, nft), ENoOfferForItem);
        let Listing {
            nft,
            price: _,
            seller,
            image: _,
            name: _,
            secret_key: _} = table::remove<ID, Listing>(&mut marketplace.listings, nft);
        assert!(seller == tx_context::sender(ctx), ENotYourListing);
        
        
        let Offer { buyer, payment, pk: _, nft: _ }  = table::remove<ID, Offer>(&mut marketplace.offers, nft);

        equality_verify(
            seller_pk,
            buyer_pk,
            prev_enc_msk, 
            &curr_enc_msk, 
            proof
        );

        let enft: EncryptedNFT = dof::remove(&mut marketplace.id, nft);
        enft.encrypted_master_key = curr_enc_msk;
        // this cannot underflow since a listing existed
        marketplace.total_listings = marketplace.total_listings - 1;

        transfer::public_transfer(enft, buyer);
        transfer::public_transfer(payment, seller);

        event::emit(OfferCompleted { buyer, nft });
    }

    public fun cancel_listing(nft: ID, marketplace: &mut Marketplace, ctx: &mut TxContext): EncryptedNFT {
        assert!(table::contains<ID, Listing>(&marketplace.listings, nft), EItemNotListed);
        let Listing {
            nft,
            price: _,
            seller,
            image: _,
            name: _,
            secret_key: _,
        } = table::remove<ID, Listing>(&mut marketplace.listings, nft);
        assert!(seller == tx_context::sender(ctx), ENotYourListing);
        marketplace.total_listings = marketplace.total_listings - 1;
        dof::remove<ID, EncryptedNFT>(&mut marketplace.id, nft)
    }

    public fun cancel_offer(nft: ID, marketplace: &mut Marketplace, ctx: &mut TxContext): Coin<SUI> {
        assert!(table::contains<ID, Offer>(&marketplace.offers, nft), ENoOfferForItem);
        let Offer { buyer, payment, pk: _, nft: _ }  = table::remove<ID, Offer>(&mut marketplace.offers, nft);
        assert! (buyer == tx_context::sender(ctx), ENotYourOffer);
        payment
    }

    public fun equality_verify(
        pk1: &Element<bls12381::G1>, // seller 
        pk2: &Element<bls12381::G1>, // buyer
        enc1: &ElGamalEncryption, // prev encryption
        enc2: &ElGamalEncryption, // curr encryption
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
        //if prev_enc_msk.ephemeral * proof.s1 - buyer_enc_pk * proof.s2
        // != (prev_enc_msk.ciphertext - curr_enc_msk.ciphertext) * c + proof.v
        
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

    // The following is insecure since the nonces are small, but in practice they should be random scalars.
    #[test_only]
    public fun insecure_equility_prove(
        pk1: &Element<bls12381::G1>,
        pk2: &Element<bls12381::G1>,
        enc1: &ElGamalEncryption,
        enc2: &ElGamalEncryption,
        sk1: &Element<bls12381::Scalar>,
        r1: u64,
        r2: u64,
    ): EqualityProof {
        let b1 = bls12381::scalar_from_u64(r1);
        let b2 = bls12381::scalar_from_u64(r1+123);
        let r2 = bls12381::scalar_from_u64(r2);

        // a1 = b1*G (for proving knowledge of sk1)
        let u1 = bls12381::g1_mul(&b1, &bls12381::g1_generator());
        // a2 = b2*g (for proving knowledge of r2)
        let u2 = bls12381::g1_mul(&b2, &bls12381::g1_generator());
        let scalars = vector::singleton(b1);
        vector::push_back(&mut scalars, bls12381::scalar_neg(&b2));
        let points = vector::singleton(enc1.ephemeral);
        vector::push_back(&mut points, *pk2);
        let v = bls12381::g1_multi_scalar_multiplication(&scalars, &points);
        // RO challenge
        let c = fiat_shamir_challenge(pk1, pk2, enc1, enc2, &u1, &u2, &v);
        // z1 = b1 + c*sk1
        let s1 = bls12381::scalar_add(&bls12381::scalar_mul(&c, sk1), &b1);
        // z2 = b2 + c*r2
        let s2 = bls12381::scalar_add(&bls12381::scalar_mul(&c, &r2), &b2);

        EqualityProof { s1, s2, u1, u2, v }
    }

    // A function to deserizalize `ElGamalEncryption`s from a vector.
    #[test_only]
    public fun elgamal_encryption_from_bytes(bytes: vector<u8>): ElGamalEncryption {
        let bytes_reader = bcs::new(bytes);
        
        let ephemeral = bls12381::g1_from_bytes(&mut bytes_reader);
        let ciphertext = bls12381::g1_from_bytes(&mut bytes_reader);
        
        ElGamalEncryption {
            ephemeral: ephemeral,
            ciphertext: ciphertext,
        }
    }

    // A function to deserizalize `EqualityProof` from bytes. 
    #[test_only]
    public fun equality_proof_from_bytes(bytes: vector<u8>): EqualityProof {
        let bytes_reader = bcs::new(bytes);
        
        let s1 = bls12381::scalar_from_bytes(&mut bytes_reader);
        let s2 = bls12381::scalar_from_bytes(&mut bytes_reader);
        let u1 = bls12381::g1_from_bytes(&mut bytes_reader);
        let u2 = bls12381::g1_from_bytes(&mut bytes_reader);
        let v = bls12381::g1_from_bytes(&mut bytes_reader);
        
        EqualityProof {
            s1: s1,
            s2: s2,
            u1: u1,
            u2: u2,
            v: v,
        }
    }
}