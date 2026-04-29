# ICOToken — Hardhat 3 + viem

ERC20 token with freeze/recall controls and a REST API for token management.

## Prerequisites

- Node.js 20+
- Yarn

## Installation

```bash
yarn install
```

## Environment Variables

Copy the values below into a `.env` file at the project root (or set them in your shell):

| Variable | Description |
|---|---|
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint (e.g. from Infura or Alchemy) |
| `SEPOLIA_PRIVATE_KEY` | Private key of the deployer account (with Sepolia ETH) |

Alternatively, store secrets with the Hardhat keystore (recommended):

```bash
yarn hardhat keystore set SEPOLIA_RPC_URL
yarn hardhat keystore set SEPOLIA_PRIVATE_KEY
```

## Compile Contracts

```bash
yarn hardhat compile
```

Artifacts are written to `artifacts/`.

## Run Tests

```bash
# All tests (runs on the local EDR-simulated chain)
yarn hardhat test

# Single test file
yarn hardhat test test/ICOToken/freeze.ts
yarn hardhat test test/ICOToken/recall.ts
yarn hardhat test test/ICOToken/burnable.ts
yarn hardhat test test/ICOToken.ts
```

Tests use the Node.js native `node:test` runner with `node:assert/strict`. No external test process is needed.

## Deploy

### Local simulated chain

```bash
yarn hardhat run scripts/deploy.ts
```

### Sepolia testnet

```bash
yarn hardhat run scripts/deploy.ts --network sepolia
```

### Mainnet

```bash
yarn hardhat run scripts/deploy.ts --network mainnet
```

The deployer account is granted all roles (`MINTER_ROLE`, `FREEZER_ROLE`, `RECALL_ROLE`, `BURNABLE_ROLE`, `DEFAULT_ADMIN_ROLE`) on deployment.

## REST API Server

The Fastify server exposes token operations over HTTP on port **1323**.

```bash
yarn tsx server/server.ts
```

### Endpoints

#### `POST /deploy`

Deploys a new ICOToken contract. Returns the contract address.

```bash
curl -X POST http://localhost:1323/deploy
```

#### `POST /mint`

Mints tokens to an address.

```bash
curl -X POST http://localhost:1323/mint \
  -H "Content-Type: application/json" \
  -d '{"to": "0xAddress", "amount": "1000"}'
```

#### `POST /burn`

Burns tokens from an account (requires `BURNABLE_ROLE`).

```bash
curl -X POST http://localhost:1323/burn \
  -H "Content-Type: application/json" \
  -d '{"who": "0xAddress", "amount": "500"}'
```

#### `POST /freeze`

Freezes an account, blocking all outgoing transfers (requires `FREEZER_ROLE`).

```bash
curl -X POST http://localhost:1323/freeze \
  -H "Content-Type: application/json" \
  -d '{"who": "0xAddress"}'
```

#### `POST /unfreeze`

Unfreezes an account (requires `FREEZER_ROLE`).

```bash
curl -X POST http://localhost:1323/unfreeze \
  -H "Content-Type: application/json" \
  -d '{"who": "0xAddress"}'
```

## Production Deployment

### Testnet (Sepolia) vs Mainnet

The codebase currently targets **Sepolia testnet**. Sepolia ETH has no real value and is safe for testing. To go live on **Ethereum mainnet**, additional code changes are required — see [Switching to Mainnet](#switching-to-mainnet) below.

---

### Deploy on Sepolia (testnet)

#### 1. Compile with optimizer

Use the `production` Solidity profile, which enables the optimizer (200 runs):

```bash
yarn hardhat compile --profile production
```

#### 2. Deploy the contract

Ensure `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` are set (keystore or `.env`), then:

```bash
yarn hardhat run scripts/deploy.ts --network sepolia
```

Note the contract address printed in the output — you need it for the next step.

#### 3. Configure the server environment

Create a `.env` file (never commit it) with the following variables:

```env
# Sepolia RPC endpoint — Infura, Alchemy, or your own node
SEPOLIA_INFURA_URL=https://sepolia.infura.io/v3/<YOUR_KEY>

# Private key of the issuer wallet — WITHOUT the 0x prefix
ISSUER_PRIVATE_KEY=<64 hex chars, no 0x>

# Token contract address from step 2
ISSUER_ADDRESS=0x<deployed contract address>
```

> **Note:** `ISSUER_PRIVATE_KEY` must be provided **without** the `0x` prefix. The server adds it internally.
>
> The server wallet must hold the roles it needs to perform operations (`MINTER_ROLE`, `FREEZER_ROLE`, `BURNABLE_ROLE`). These are all granted to the deployer by default, so use the same key or grant roles to a separate key with `grantRole` before switching.

#### 4. Start the server

```bash
yarn tsx server/server.ts
```

The server listens on port **1323**. To run it as a background service, use a process manager such as PM2:

```bash
# Install PM2 once
npm install -g pm2

# Start
pm2 start --interpreter tsx server/server.ts --name ico-api

# View logs
pm2 logs ico-api

# Auto-restart on reboot
pm2 save && pm2 startup
```

---

### Switching to Mainnet

Deploying to Ethereum mainnet requires changes in three places:

#### 1. `.env` — point to a mainnet RPC

```env
RPC_URL=https://mainnet.infura.io/v3/<YOUR_KEY>
```

#### 2. `hardhat.config.ts` — add a mainnet network

```ts
mainnet: {
  type: "http",
  chainType: "l1",
  url: configVariable("RPC_URL"),
  accounts: [configVariable("MAINNET_PRIVATE_KEY")],
},
```

Then deploy with:

```bash
yarn hardhat run scripts/deploy.ts --network mainnet
```

#### 3. Server libs — replace `sepolia` chain with `mainnet`

In each of these files — `server/libs/deploy.ts`, `mint.ts`, `burn.ts`, `freeze.ts`, `unfreeze.ts` — change:

```ts
// Before
import { sepolia } from "viem/chains"
// ...
createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_INFURA_URL!) })
createWalletClient({ chain: sepolia, transport: http(process.env.SEPOLIA_INFURA_URL!) })

// After
import { mainnet } from "viem/chains"
// ...
createPublicClient({ chain: mainnet, transport: http(process.env.RPC_URL!) })
createWalletClient({ chain: mainnet, transport: http(process.env.RPC_URL!) })
```

> **Warning:** Mainnet transactions cost real ETH. Always test on Sepolia first.

---

## Token Features

- **Freeze / Unfreeze** — block or re-enable outgoing transfers for an account
- **Recall** — force-transfer tokens from a frozen account to any address (requires account to be frozen first)
- **BurnFrom** — burn tokens from any account without allowance (role-gated)
- All admin operations are role-based via OpenZeppelin `AccessControl`
