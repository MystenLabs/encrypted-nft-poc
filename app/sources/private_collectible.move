// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The module which defines the `Collectible` type. It is an all-in-one
/// package to create a `Display`, a `Publisher` and a `TransferPolicy` to
/// enable `Kiosk` trading from the start.
module marketplace::private_collectible {
    use sui::transfer;
    use std::vector as vec;
    use std::string::String;
    use std::option::{Self, Option};
    use sui::package::{Self, Publisher};
    use sui::display::{Self, Display};
    use sui::borrow::{Self, Referent, Borrow};
    use sui::tx_context::{sender, TxContext};
    use sui::object::{Self, UID};
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::transfer_policy::{
        Self as policy,
        TransferPolicyCap
    };
    use sui::kiosk_extension as ext;

    /// Trying to `claim_ticket` with a non OTW struct.
    const ENotOneTimeWitness: u64 = 0;
    /// The type parameter `T` is not from the same module as the `OTW`.
    const ETypeNotFromModule: u64 = 1;
    /// Maximum size of the Collection is reached - minting forbidden.
    const ECapReached: u64 = 2;
    /// Names length does not match `image_urls` length
    const EWrongNamesLength: u64 = 3;
    /// Descriptions length does not match `image_urls` length
    const EWrongDescriptionsLength: u64 = 4;
    /// Creators length does not match `image_urls` length
    const EWrongCreatorsLength: u64 = 5;
    /// Metadatas length does not match `image_urls` length
    const EWrongMetadatasLength: u64 = 6;

    const PERMISSIONS: u128 = 2;

    // === Extension ===

    /// The Extension Witness.
    struct ExchangeData has drop {}

    struct BuyerPublicKey has drop {}

    struct AuthenticatorData has drop {}

    /// Centralized registry to provide access to system features of
    /// the Collectible.
    struct Registry has key {
        id: UID,
        publisher: Publisher
    }

    /// One-in-all capability wrapping all necessary functions such as
    /// `Display`, `PolicyCap` and the `Publisher`.
    struct CollectionCap<T: store> has key, store {
        id: UID,
        publisher: Referent<Publisher>,
        display: Referent<Display<Collectible<T>>>,
        policy_cap: Referent<TransferPolicyCap<Collectible<T>>>,
        max_supply: Option<u32>,
        minted: u32,
        burned: u32,
    }

    /// Special object which connects init function and the collection
    /// initialization.
    struct CollectionTicket<phantom T: store> has key, store {
        id: UID,
        publisher: Publisher,
        max_supply: Option<u32>
    }

    /// Basic collectible containing most of the fields from the proposed
    /// Display set. The `metadata` field is a generic type which can be
    /// used to store any custom data.
    struct Collectible<T: store> has key, store {
        id: UID,
        image_url: String,
        name: Option<String>,
        description: Option<String>,
        creator: Option<String>,
        meta: Option<T>,
    }

    /// OTW to initialize the Registry and the base type.
    struct COLLECTIBLE has drop {}

    /// Create the centralized Registry of Collectibles to provide access
    /// to the Publisher functionality of the Collectible.
    fun init(otw: COLLECTIBLE, ctx: &mut TxContext) {
        transfer::share_object(Registry {
            id: object::new(ctx),
            publisher: package::claim(otw, ctx)
        })
    }

    /// Called in the external module initializer. Sends a `CollectionTicket`
    /// to the transaction sender which then enables them to initialize the
    /// Collection.
    ///
    /// - The OTW parameter is a One-Time-Witness;
    /// - The T parameter is the expected Metadata / custom type to use for
    /// the Collection;
    public fun claim_ticket<OTW: drop, T: store>(otw: OTW, max_supply: Option<u32>, ctx: &mut TxContext) {
        assert!(sui::types::is_one_time_witness(&otw), ENotOneTimeWitness);

        let publisher = package::claim(otw, ctx);

        assert!(package::from_module<T>(&publisher), ETypeNotFromModule);
        transfer::transfer(CollectionTicket<T> {
            id: object::new(ctx),
            publisher,
            max_supply
        }, sender(ctx));
    }

    /// Use the `CollectionTicket` to start a new collection and receive a
    /// `CollectionCap`.
    /// also add an extension to store aux data 
    public fun create_collection<T: store>(
        registry: &Registry,
        ticket: CollectionTicket<T>,
        ctx: &mut TxContext
    ): CollectionCap<T> {
        let CollectionTicket { id, publisher, max_supply } = ticket;
        object::delete(id);

        let display = display::new<Collectible<T>>(&registry.publisher, ctx);
        let (policy, policy_cap) = policy::new<Collectible<T>>(
            &registry.publisher, ctx
        );

        transfer::public_share_object(policy);

        ext::add(ExchangeData {}, kiosk, cap, PERMISSIONS, ctx)

        CollectionCap<T> {
            id: object::new(ctx),
            display: borrow::new(display, ctx),
            publisher: borrow::new(publisher, ctx),
            policy_cap: borrow::new(policy_cap, ctx),
            max_supply,
            minted: 0,
            burned: 0,
        }
    }

    /// Batch mint a vector of Collectibles specifying the fields. Lengths of
    /// the optional fields must match the length of the `image_urls` vector.
    /// Metadata vector is also optional, which
    public fun batch_mint_and_list_with_purchase_cap<T: store>(
        cap: &mut CollectionCap<T>,
        image_urls: vector<String>,
        names: Option<vector<String>>,
        descriptions: Option<vector<String>>,
        creators: Option<vector<String>>,
        metas: Option<vector<T>>,
        ctx: &mut TxContext
    ) {
    // ): vector<Collectible<T>> {
        let len = vec::length(&image_urls);
        // let res = vec::empty();

        // perform a dummy check to make sure collection does not overflow
        // safe to downcast since the length will never be greater than u32::MAX
        assert!(
            option::is_none(&cap.max_supply)
            || cap.minted + (len as u32) < *option::borrow(&cap.max_supply)
        , ECapReached);

        assert!(
            option::is_none(&names)
            || vec::length(option::borrow(&names)) == len
        , EWrongNamesLength);

        assert!(
            option::is_none(&creators)
            || vec::length(option::borrow(&creators)) == len
        , EWrongCreatorsLength);

        assert!(
            option::is_none(&descriptions)
            || vec::length(option::borrow(&descriptions)) == len
        , EWrongDescriptionsLength);

        assert!(
            option::is_none(&metas)
            || vec::length(option::borrow(&metas)) == len
        , EWrongMetadatasLength);

        while (len > 0) {
            // vec::push_back(&mut res, mint(
            let obj = mint(
                cap,
                vec::pop_back(&mut image_urls),
                pop_or_none(&mut names),
                pop_or_none(&mut descriptions),
                pop_or_none(&mut creators),
                pop_or_none(&mut metas),
                ctx
            );

            sui::transfer::transfer(obj, sender(ctx));
            // ));

            len = len - 1;
        };

        if (option::is_some(&metas)) {
            let metas = option::destroy_some(metas);
            vec::destroy_empty(metas)
        } else {
            option::destroy_none(metas);
        };

        // res

        kiosk::list_with_purchase_cap(kiosk, cap, id, ctx);
    }

    /// buyer init purchase by posting pk onchain, listing is now locked for this offer.
    public fun init_offer(
        self: &mut Kiosk, purchase_cap: PurchaseCap<T>, pk: vec<u8>, payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // this call 
        // 1) checks the payment is above the listing price
        // 2) create a transfer request
        kiosk::purchase_with_cap(kiosk, purchase_cap, payment);
        
        // 3) post pubkey (pkB) to kiosk extension
        let offer = offer::new(object::id(purchase_cap), pk, ctx);
        let storage = ext::storage_mut(ExchangeData {}, kiosk);
        bag::add(storage, BuyerPublicKey {}, option::some(offer));
    }

    /// if x time has passed and encrypteded master key is not reveived, 
    // then active offer is removed, payment returned
    public fun expire_offer(
        self: &mut Kiosk, purchase_cap: PurchaseCap<T>,
        ctx: &mut TxContext
    ) {
        // check expiry of an offer

        // this call release the purchase cap
        kiosk::return_purchase_cap(kiosk, purchase_cap);
        // remove the pk from extension
        let storage = ext::storage_mut(ExchangeData {}, kiosk);
        bag::remove(storage, option::some(offer));
    }

    /// creator posts a valid proof and its encrypted master key, collect payment
    public fun fulfill_offer(
        self: &mut Kiosk, request: KioskOwnerCap<T>, proof: vector<u8>
        ctx: &mut TxContext
    ) {
        transfer_policy::confirm_request(request);
        let storage = ext::storage_mut(ExchangeData {}, kiosk);
        verify_proof(proof);
        let data = AuthenticatorData::new(proof, encrypted_master_key);
        bag::add(storage, AuthenticatorData {}, option::some(buy));
    }

}