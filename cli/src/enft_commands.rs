// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use clap::Parser;
use fastcrypto::encoding::{Base64, Encoding};
use fastcrypto::{
    groups::{FiatShamirChallenge, GroupElement, HashToGroupElement, Scalar as ScalarTrait},
    hash::HashFunction,
};
use fastcrypto::groups::bls12381::{ G1Element, G2Element, GTElement, Scalar};
use fastcrypto::serde_helpers::ToFromByteArray;
#[derive(Parser)]
#[command(name = "enft-cli")]
#[command(about = "Offchain utilities for key generating, encrypting and decrypting NFTs", long_about = None)]
enum Command {
    /// Generate 
    KeyGen,
}

#[derive(Parser, Clone)]
struct Arg {
    #[clap(short, long)]
    value: String,
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
        Command::KeyGen => {
            let sk: Scalar = Scalar::rand(&mut rand::thread_rng());
            let gen = G1Element::generator();
            let pk = gen * sk;
            let file_name = format!("bls-{}.key", Base64::encode(pk.to_byte_array()));
            let contents = Base64::encode(sk.to_byte_array());
            println!("Writing key to {}", file_name);
            std::fs::write(file_name, contents)?;
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::{execute, Arg, Command};

    #[test]
    fn test_keygen() {
        assert!(execute(Command::KeyGen()).is_ok());
    }
}
