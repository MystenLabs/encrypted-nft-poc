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
        secret_key: vector<u8>
    }
    

    // the NFT type we're using. We can also make this generic but keeping this like this for simplicity.
    struct EncryptedNFT has key, store {
        id: UID,
        name: String,
        image_url: String, // s3 or ipfs image url, todo: use metadata with display
        ciphertext_url: String,
        price: u64,
        encrypted_master_key: vector<u8>,
    }

    /// Represents the intent of a buyer to purchase.
    /// Contains the public key of the buyer.
    struct Offer has store {
        buyer: address,
        payment: Coin<SUI>,
        pk: vector<u8>,
        nft: ID // refers to the ID of EncryptedNFT
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
        encrypted_master_key: vector<u8>,
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
    public entry fun accept_offer(
        marketplace: &mut Marketplace, 
        nft: ID,
        _proof: vector<u8>,
        // proof: EqualityProof,
        encrypted_master_key: vector<u8>,
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

        // equility_verify(&pk1, &pk2, &enc1, &enc2, &proof);
        // pub struct ConsistencyProof<ScalarType, G1Element> {
        // pub s1: ScalarType,
        // pub s2: ScalarType,
        // pub u1: G1Element,
        // pub u2: G1Element,
        // pub v: G1Element,
        // }

        let enft: EncryptedNFT = dof::remove(&mut marketplace.id, nft);
        enft.encrypted_master_key = encrypted_master_key;
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

}