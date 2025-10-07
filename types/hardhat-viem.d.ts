// types/hardhat-viem.d.ts
import "hardhat/types/runtime";
import type { HardhatViem } from "@nomicfoundation/hardhat-viem/types";

declare module "hardhat/types/runtime" {
    interface HardhatRuntimeEnvironment {
        viem: any;
    }
}