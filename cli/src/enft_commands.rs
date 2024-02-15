// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::utils::{load_and_sample_image, save_image};
use clap::Parser;
use fastcrypto::aes::Cipher;
use fastcrypto::aes::InitializationVector;
use fastcrypto::encoding::{Encoding, Hex};
use fastcrypto::groups::bls12381::{G1Element, Scalar};
use fastcrypto::hash::Sha3_512;
use fastcrypto::serde_helpers::ToFromByteArray;
use fastcrypto::traits::Generate;
use fastcrypto::{
    groups::{FiatShamirChallenge, GroupElement, Scalar as ScalarTrait},
    hash::HashFunction,
};
use serde::{Deserialize, Serialize};
use typenum::U12;
use utils::{msk_to_cipher, recover_image};

pub mod utils;

#[derive(Parser)]
#[command(name = "enft-cli")]
#[command(about = "Offchain utilities for key generating, encrypting and decrypting NFTs", long_about = None)]
enum Command {
    /// Generate a master key. This can be used by the creator only.
    GenerateMasterKey,

    /// Generate the encryption key. This can be used by either the buyer
    /// or the creator.
    GenerateEncryptionKey,

    /// Encrypt the master key under the given pubkey. Output encrypted
    /// master key (enc_msk) and ciphertext. This is done by creator when
    /// listing the NFT. The obfuscated NFT, enc_msk and ciphertext are
    /// posted on-chain.
    Encrypt(EncryptArgs),

    /// Encrypt the master key under the buyer pubkey. Output the newly
    /// encrypted master key and consistency proof. This is called by the
    /// seller when an NFT is transferred.
    Transfer(TransferArgs),

    /// Decrypt the original NFT from ciphertext. This can be done by
    /// anyone who can recover the master key and decrypt from ciphertext.
    Decrypt(DecryptArgs),

    /// Decrypt the original NFT from ciphertext. This can be done by
    /// anyone who can recover the master key and decrypt from ciphertext.
    Verify(VerifyArgs),
}

#[derive(Parser, Clone)]
struct EncryptArgs {
    /// A path for the original file.
    #[clap(short, long)]
    image_path: String,

    /// A hex encoding of the master private key to encrypt with.
    #[clap(short, long)]
    master_sk: String,

    /// A hex encoding of the pubkey to encrypt with.
    #[clap(short, long)]
    enc_pk: String,
}

#[derive(Parser, Clone)]
struct TransferArgs {
    /// A hex encoding of the master private key to encrypt with.
    #[clap(short, long)]
    master_sk: String,
    /// An encrypted master key under the seller's pubkey.
    #[clap(short, long)]
    prev_enc_msk: String,
    /// A hex encoding of the buyer pk, i.e. pubkey to encrypt with.
    #[clap(short, long)]
    buyer_pk: String,
    /// A hex encoding of the seller's encryption private key.
    #[clap(short, long)]
    seller_enc_sk: String,
}

#[derive(Parser, Clone)]
struct DecryptArgs {
    /// A hex encoding of the master private key to encrypt with.
    #[clap(short, long)]
    enc_master_sk: String,

    /// A path to get the raw ciphertext bytes.
    #[clap(short, long)]
    ciphertext_path: String,

    /// A hex encoding of the buyer's private key.
    #[clap(short, long)]
    buyer_sk: String,
}

#[derive(Parser, Clone)]
struct VerifyArgs {
    /// A hex encoding of the master private key to encrypt with.
    #[clap(short, long)]
    serialized_proof: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct KeyEncryption<G1Element> {
    pub g_to_r: G1Element,
    pub m_pk_to_r: G1Element,
}

/// A proof that two encrypted master keys are consistent wrt the same master key.
#[derive(Clone, Serialize, Deserialize)]
pub struct ConsistencyProof {
    pub s1: Scalar,
    pub s2: Scalar,
    pub u1: G1Element,
    pub u2: G1Element,
    pub v: G1Element,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FullCipherText {
    pub pixels: Vec<(usize, usize)>,
    pub iv: InitializationVector<U12>,
    pub ciphertext: Vec<u8>,
}

fn main() {
    match execute(Command::parse()) {
        Ok(_) => {
            std::process::exit(exitcode::OK);
        }
        Err(e) => {
            println!("Error: {}", e);
            std::process::exit(exitcode::DATAERR);
        }
    }
}

fn execute(cmd: Command) -> Result<(), std::io::Error> {
    match cmd {
        Command::GenerateMasterKey => {
            let scalar: Scalar = Scalar::rand(&mut rand::thread_rng());
            let gen = G1Element::generator();
            let g1 = gen * scalar;
            let msk = Hex::encode(g1.to_byte_array());
            println!("Master sk: {}", msk);
            Ok(())
        }
        Command::GenerateEncryptionKey => {
            let sk: Scalar = Scalar::rand(&mut rand::thread_rng());
            let gen = G1Element::generator();
            let pk = gen * sk;
            let pk_str = Hex::encode(pk.to_byte_array());
            let sk_str = Hex::encode(sk.to_byte_array());
            println!("Encryption sk: {}", sk_str);
            println!("Encryption pk: {}", pk_str);
            Ok(())
        }
        Command::Encrypt(args) => {
            let msk = G1Element::from_byte_array(
                &Hex::decode(&args.master_sk).unwrap().try_into().unwrap(),
            )
            .unwrap();
            let enc_pk =
                G1Element::from_byte_array(&Hex::decode(&args.enc_pk).unwrap().try_into().unwrap())
                    .unwrap();
            let mut rng = rand::thread_rng();

            // 1. Encrypt the master key under the given pubkey.
            let gen = <G1Element as GroupElement>::generator();
            let encryption_randomness = <G1Element as GroupElement>::ScalarType::rand(&mut rng);
            let encrypted_msk = KeyEncryption {
                g_to_r: gen * encryption_randomness,
                m_pk_to_r: enc_pk * encryption_randomness + msk,
            };
            let encrypted_msk = Hex::encode(bcs::to_bytes(&encrypted_msk).unwrap());
            println!("Encrypted master sk:");
            println!("{:?}", encrypted_msk);

            // 2. Generate the ciphertext.
            // First initialize an AES cipher from the seed deterministically derived from the master key.
            // i.e. the AES encryption key is derived from the master key.
            let cipher = msk_to_cipher(&msk);

            let preprocessed = load_and_sample_image(args.image_path.as_str());
            let iv = InitializationVector::<U12>::generate(&mut rng);
            let ciphertext = cipher.encrypt(&iv, preprocessed.selected_values.as_slice());
            let full_ciphertext = FullCipherText {
                pixels: preprocessed.selected_coordinates,
                iv,
                ciphertext,
            };
            let contents = Hex::encode(bcs::to_bytes(&full_ciphertext).unwrap());
            std::fs::write("ciphertext", contents)?;
            println!("Ciphertext written to file.");

            save_image("obfuscated_nft.png", &preprocessed.obfuscated_image);
            println!("Obfuscated image to file.");
            Ok(())
        }
        Command::Transfer(args) => {
            let prev_enc_msk: KeyEncryption<G1Element> =
                bcs::from_bytes(&Hex::decode(&args.prev_enc_msk).unwrap()).unwrap();
            let buyer_pk = G1Element::from_byte_array(
                &Hex::decode(&args.buyer_pk).unwrap().try_into().unwrap(),
            )
            .unwrap();
            let msk = G1Element::from_byte_array(
                &Hex::decode(&args.master_sk).unwrap().try_into().unwrap(),
            )
            .unwrap();
            let seller_enc_sk = Scalar::from_byte_array(
                &Hex::decode(&args.seller_enc_sk)
                    .unwrap()
                    .try_into()
                    .unwrap(),
            )
            .unwrap();

            // first generate the newly encrypted master key under the buyer pk.
            let gen = <G1Element as GroupElement>::generator();
            let mut rng = rand::thread_rng();
            let encryption_randomness = <G1Element as GroupElement>::ScalarType::rand(&mut rng);
            let new_enc_msk = KeyEncryption {
                g_to_r: gen * encryption_randomness,
                m_pk_to_r: buyer_pk * encryption_randomness + msk,
            };
            let new_enc_sk = Hex::encode(bcs::to_bytes(&new_enc_msk).unwrap());
            println!("Serialized newly encrypted master key (under buyer pk):");
            println!("{:?}", new_enc_sk);

            // then generate a proof that new_enc_msk and prev_enc_msk are consistent wrt msk.
            let alpha: Scalar = Scalar::rand(&mut rng);
            let beta: Scalar = Scalar::rand(&mut rng);

            let u1 = gen * alpha;
            let u2 = gen * beta;
            let v = prev_enc_msk.g_to_r * alpha - buyer_pk * beta;

            let mut fiat_shamir_msg = Sha3_512::new();
            fiat_shamir_msg.update(seller_enc_sk.to_byte_array());
            fiat_shamir_msg.update(&bcs::to_bytes(&prev_enc_msk).unwrap());
            fiat_shamir_msg.update(buyer_pk.to_byte_array());
            fiat_shamir_msg.update(&bcs::to_bytes(&new_enc_msk).unwrap());
            fiat_shamir_msg.update(u1.to_byte_array());
            fiat_shamir_msg.update(u2.to_byte_array());
            fiat_shamir_msg.update(v.to_byte_array());

            let digest = fiat_shamir_msg.finalize().digest;
            let c =
                <Scalar as FiatShamirChallenge>::fiat_shamir_reduction_to_group_element(&digest);

            let proof = ConsistencyProof {
                s1: seller_enc_sk * c + alpha,
                s2: encryption_randomness * c + beta,
                u1,
                u2,
                v,
            };

            let proof = Hex::encode(bcs::to_bytes(&proof).unwrap());
            println!("Serialized consistency proof:");
            println!("{:?}", proof);

            Ok(())
        }
        Command::Decrypt(args) => {
            let enc_msk: KeyEncryption<G1Element> =
                bcs::from_bytes(&Hex::decode(&args.enc_master_sk).unwrap()).unwrap();
            let ciphertext: FullCipherText =
                bcs::from_bytes(&std::fs::read(&args.ciphertext_path).unwrap()).unwrap();
            let obfuscated_image = std::fs::read("obfuscated_nft.png").unwrap();
            let buyer_sk =
                Scalar::from_byte_array(&Hex::decode(&args.buyer_sk).unwrap().try_into().unwrap())
                    .unwrap();

            let msk = enc_msk.m_pk_to_r - enc_msk.g_to_r * buyer_sk;
            let original = recover_image(&obfuscated_image, ciphertext, msk);
            save_image("original_nft.png", &original);
            Ok(())
        }
        Command::Verify(args) => {
            let _proof: ConsistencyProof =
                bcs::from_bytes(&Hex::decode(&args.serialized_proof).unwrap()).unwrap();

            Ok(())
        }
    }
}
