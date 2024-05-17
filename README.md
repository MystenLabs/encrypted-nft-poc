# Encrypted NFT Demo

This dApp was created using `@mysten/create-dapp` that sets up a simple React
Client dApp using the following tools:

- [React](https://react.dev/) as the UI framework
- [TypeScript](https://www.typescriptlang.org/) for type checking
- [Vite](https://vitejs.dev/) for build tooling
- [Radix UI](https://www.radix-ui.com/) for pre-built UI components
- [ESLint](https://eslint.org/) for linting
- [`@mysten/dapp-kit`](https://sdk.mystenlabs.com/dapp-kit) for connecting to
  wallets and loading data
- [pnpm](https://pnpm.io/) for package management

## Deploying your Move code

### Install Sui cli

Before deploying your move code, ensure that you have installed the Sui CLI. You
can follow the [Sui installation instruction](https://docs.sui.io/build/install)
to get everything set up.

This template uses `devnet` by default, so we'll need to set up a devnet
environment in the CLI:

```bash
sui client new-env --alias devnet --rpc https://fullnode.devnet.sui.io:443
sui client switch --env devnet
```

If you haven't set up an address in the sui client yet, you can use the
following command to get a new address:

```bash
sui client new-address secp256k1
```

This well generate a new address and recover phrase for you. You can mark a
newly created address as you active address by running the following command
with your new address:

```bash
sui client switch --address 0xYOUR_ADDRESS...
```

We can ensure we have some Sui in our new wallet by requesting Sui from the
faucet (make sure to replace the address with your address):

```bash
curl --location --request POST 'https://faucet.devnet.sui.io/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
    "FixedAmountRequest": {
        "recipient": "0xYOUR_ADDRESS"
    }
}'
```

### Publishing the move package

The move code for this template is located in the `package` directory. To publish the smart contract, run the script:
```

# change network if needed
sui client active-env
sui client switch --env testnet

cd app/publish/
./publish.sh 
```

This will create an `app/.env` file in the app with the package id and the network you published to. 

This sets the default server running at `http://localhost:3000`. This can be changed in `backend/server.ts#175` by modifying the number after `app.listen(3000 ...)`.

### Running the demo

This project has a backend, a frontend and a move contract that can be found respectively in:
`app/`, `backend/` and `package/`.

Copy the `backend/env.example` file to `backend/.env` and edit the bucket values according to your S3 configurations as follows: 
```
BUCKET_REGION="us-east-1" # ca;
BUCKET_ADDRESS="s3://..."
BUCKET_NAME="my_bucket"
BUCKET_FOLDER="encryptedNFT"
BUCKET_KEY="..."
BUCKET_SECRET="..."
```

This example uses AWS S3 to store resources. This can be modified for other storage solutions. To set up an AWS S3 bucket, go to https://aws.amazon.com/s3/ and create a bucket with a name, then update `backend/.env`. 


Copy `app/.env.example` to  `app/.env` file and edit the following:

```
VITE_PACKAGE_ID="0xCONTRACT_ADDRESS" # see contract address from the previous publishing step
VITE_ACTIVE_NETWORK="testnet" // or the network your contract lives in.
VITE_BACKEND="http://localhost:3000" // or whichever port your backend is listening to.
```
To run the backend, from `backend/` run `pnpm install && pnpm dev`.
In another tab, to run the frontend, from `app/` run `pnpm install && pnpm dev`.

### Exploring the demo
Open a browser and navigate to frontend localhost (by default). If you changed the port, input the correct port.