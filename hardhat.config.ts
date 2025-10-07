// import { config as dotenv } from "dotenv";
// dotenv();

import type { HardhatUserConfig } from "hardhat/config";

import "@nomicfoundation/hardhat-toolbox-viem";


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    local: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
  }
};

export default config;
