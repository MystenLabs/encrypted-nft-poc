module package::private_nft {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;

    use std::string::String;


    struct EncryptedNFT has key, store {
        id: UID,
        name: String,
        image_url: String, // s3 or ipfs image url, todo: use metadata with display
        ciphertext_url: String,
        encrypted_master_key: vector<u8>,
        proof: vector<u8>
    }


    public fun new(
        name: String,
        image_url: String,
        ciphertext_url: String,
        encrypted_master_key: vector<u8>,
        proof: vector<u8>,
        ctx: &mut TxContext
        ): EncryptedNFT 
    {
        EncryptedNFT {
            id: object::new(ctx),
            name,
            image_url,
            ciphertext_url,
            encrypted_master_key,
            proof,
        }
    }


    public fun transfer_to(
        self: EncryptedNFT,
        to: address,
        new_encrypted_master_key: vector<u8>,
        new_proof: vector<u8>,
        _ctx: &mut TxContext) {
        self.encrypted_master_key = new_encrypted_master_key;
        self.proof = new_proof;
        transfer::public_transfer(self, to);
    }
}