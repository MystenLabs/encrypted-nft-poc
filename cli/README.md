# CLI

```
cargo build --bin enft-cli

target/debug/enft-cli -h

# creator generates msk

target/debug/enft-cli generate-master-key
Master sk: afc2593f0f96fd7e274bbb3d87bd2557720e7a0baf47869c19a9b17f7d5a652b15880cbc069683155e33a3ad93a83e5e

# creator/buyer generate encryption key (AES key). 
target/debug/enft-cli generate-encryption-key
Encryption sk: 2fd7a46d6c4955630c91f6960b4cfc02f07254d0f41feccf03f67c3e2f07576f
Encryption pk: 86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892

# creator encrypts the master key to the provided encryption key. Outputs the following: 
# 1. prints out encrypted master key 
# 2. output ciphertext to file 
# 3. output obfuscated_nft.png to file

target/debug/enft-cli encrypt -i ../capy.png --master-sk afc2593f0f96fd7e274bbb3d87bd2557720e7a0baf47869c19a9b17f7d5a652b15880cbc069683155e33a3ad93a83e5e --enc-pk 86e2dc6d7c0e0ee4744c7625bedfe8462b8e63262f41fa6403316f90a10e69466f53ef4f9dd5bcca9a460b797bfd8892

Encrypted master sk:
"98fe15f40ae24dd8f75e8e6da3569d757406a090495a1e4a8d6a5962a4cd63a5fc55a97d6646596bc32f4d36057f1d48854a03e25b3deca9b289b71dbfd4b4054ae7bc8fac8158da46958981fd97cf3b7d48d2f258f5ec8e9c3c1e18b2aef012"
Ciphertext written to file.
Obfuscated image to file.

# 
```