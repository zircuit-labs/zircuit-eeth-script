import { EthChainId } from "@sentio/sdk/eth";

export const CONFIG = {
  BLOCKCHAIN: EthChainId.ETHEREUM,
};

export const MISC_CONSTS = {
  ONE_E18: BigInt("1000000000000000000"),
  ONE_DAY_IN_MINUTE: 60 * 24,
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  MULTICALL_BATCH: 256,
  EETH_POINT_RATE: BigInt("1000000000000000000"),
};

export const PENDLE_POOL_ADDRESSES = {
  // retrieved from Pendle pool contract readTokens()
  SY: "0xd7df7e085214743530aff339afc420c7c720bfa7",
  // retrieved from Pendle pool contract readTokens()
  YT: "0x323da63d354c9d79df927fd21ce5b97add3a50d9",
  // using new pool contract
  LP: "0x6c269dfc142259c52773430b3c78503cc994a93e",
  // the block which the new contract is deployed
  START_BLOCK: 20158640,
  TREASURY: "0x8270400d528c34e1596ef367eedec99080a1b592",
  EQB_STAKING: "0xb68bba67c943665343d388302aa4c82754d4bd34",
  PENPIE_RECEIPT_TOKEN: "0xeb808b323d8b9f2e2424b83e8a08c5f2633c9254",
  // STAKEDAO_RECEIPT_TOKEN: "0xdd9df6a77b4a4a07875f55ce5cb6b933e52cb30a",
  MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",
  LIQUID_LOCKERS: [
    {
      // Penpie
      address: "0x6e799758cee75dae3d84e09d40dc416ecf713652",
      receiptToken: "0xeb808b323d8b9f2e2424b83e8a08c5f2633c9254",
    },
    {
      // EQB
      address: "0x64627901dadb46ed7f275fd4fc87d086cff1e6e3",
      receiptToken: "0xb68bba67c943665343d388302aa4c82754d4bd34",
    },
  ],
};

export const V1_END_TIMESTAMP = 1719446399n; // 2024-06-26 23:59:59 UTC

export const MULTIPLIERS = {
  campaign: {
    startTimestamp: 1719187200n, // 2024-06-24 00:00:00 UTC
    endTimestamp: 1720655999n, // 2024-07-10 23:59:59 UTC
    multiplier: 200n,
  },
  multiplier: 150n,
  baseFactor: 100n,
  expiry: 1724284800n, // 2024-08-22 00:00:00 UTC
};
