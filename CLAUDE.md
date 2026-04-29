# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Compile contracts
yarn hardhat compile

# Run all tests
yarn hardhat test

# Run a specific test file
yarn hardhat test test/ICOToken/burnable.ts

# Run tests on a specific network (default is hardhatMainnet)
yarn hardhat test --network hardhatMainnet

# Deploy to Sepolia
yarn hardhat run scripts/deploy.ts --network sepolia

# Start the API server
yarn tsx server/server.ts
```

## Architecture

This project combines **Solidity smart contracts** (Hardhat 3 + viem) with a **Fastify REST API** that wraps blockchain operations.

### Smart Contracts (`contracts/`)

Two contracts live here:

- **`ICOToken.sol`** — The primary token. Extends `ERC20`, `ERC20Burnable`, and `AccessControl` with four custom roles:
  - `MINTER_ROLE` — can call `mint()`
  - `FREEZER_ROLE` — can call `freeze()` / `unfreeze()`
  - `RECALL_ROLE` — can call `recall()` (force-transfers tokens from a frozen account)
  - `BURNABLE_ROLE` — can call `burnFrom()` without the usual allowance requirement
  - `_transfer` is overridden to block outgoing transfers from frozen accounts (except during a `recall`)

- **`ICOToken1.sol`** — A simpler token plus a `SoftcapCrowdsale` contract that accepts ETH, tracks contributions per address, and emits `SoftcapHit` when a soft-cap threshold is crossed.

### Tests (`test/`)

Uses **Node.js native `node:test`** (not Mocha/Jest). Assertions use `node:assert/strict`. Each test file accesses the Hardhat network via:

```ts
import { network } from "hardhat";
const conn = await network.connect();
const hviem = conn.viem;
const wallets = await hviem.getWalletClients();
```

Contracts are deployed inline per-test with `hviem.deployContract("ICOToken")`. There is no shared fixture or external deploy step.

| File | What it covers |
|------|---------------|
| `test/ICOToken.ts` | ICOToken1 minting, SoftcapCrowdsale |
| `test/ICOToken/freeze.ts` | freeze / unfreeze / role guards |
| `test/ICOToken/recall.ts` | recall (force transfer from frozen account) |
| `test/ICOToken/burnable.ts` | burnFrom role-based access |

### REST API (`server/`)

Fastify 5 server (port 1323) that exposes blockchain operations as HTTP endpoints:

- `POST /deploy` — deploys ICOToken
- `POST /mint` — mints tokens
- `POST /burn` — burns tokens via `burnFrom`
- `POST /freeze` / `POST /unfreeze` — account freeze management

Business logic lives in `server/libs/` (one file per operation). Each lib function uses viem's `simulateContract` + `writeContract` pattern. The `server/routes/` directory contains additional example route handlers.

### Hardhat Configuration

- **Default network:** `hardhatMainnet` (EDR-simulated L1)
- **Also available:** `hardhatOp` (EDR-simulated OP chain), `sepolia` (HTTP)
- **Solidity profiles:** `default` (no optimizer) and `production` (optimizer 200 runs)
- Uses `configVariable()` for secrets — Sepolia RPC URL and private key must be set via `yarn hardhat keystore` or environment variables.

### Key Dependencies

- **viem** — used everywhere for Ethereum interactions (not ethers.js, despite ethers being installed)
- **OpenZeppelin Contracts 5.x** — base for ERC20, AccessControl, ReentrancyGuard
- **Hardhat 3** — note Hardhat 3 has API differences from v2 (plugins are declared under `plugins:[]`, networks use `type: "edr-simulated"`)
