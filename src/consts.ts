import { EthChainId } from '@sentio/sdk/eth'


export const CONFIG = {
    BLOCKCHAIN: EthChainId.ETHEREUM,
}

const SEASON_1_END_TIME_BIGINT = BigInt(1720368000); // 7 july
const START_TIME_V2 = BigInt(1719187200); // 24 june
const END_TIME_V1 = BigInt(1719446400); // 27 june
const END_TIME_V2 = BigInt(1724284800); // 22 august
const JULY_11 = BigInt(1720656000); // 11 july

export const MISC_CONSTS = {
    ONE_E18: BigInt("1000000000000000000"),
    ONE_DAY_IN_MINUTE: 60 * 24,
    ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
    MULTICALL_BATCH: 256,
    EETH_POINT_RATE: BigInt("1000000000000000000"),
    PENDLE_DEFAULT_MULTIPLIER: BigInt(2),
    CUTOFF_TIME: SEASON_1_END_TIME_BIGINT, // this should be changed for regular v2
    FULL_EXECUTION_INTERVAL: BigInt(86400),
}

export const MULTIPLIER_TIMELINE_SY = [
    {
      timestamp: 0n,
      factor: 0n,
    },
    {
      timestamp: END_TIME_V1,
      factor: 200n,
    },
    {
      timestamp: JULY_11,
      factor: 150n,
    },
    {
      timestamp: END_TIME_V2,
      factor: 0n,
    }
]

export const MULTIPLIER_TIMELINE = [
    {
      timestamp: 0n,
      factor: 0n,
    },    
    {
      timestamp: START_TIME_V2,
      factor: 200n,
    },
    {
      timestamp: JULY_11,
      factor: 150n,
    },
    {
      timestamp: END_TIME_V2,
      factor: 0n,
    }
]

export const PENDLE_POOL_ADDRESSES = {
    SY: "0xd7df7e085214743530aff339afc420c7c720bfa7",
    YT: "0x323da63d354c9d79df927fd21ce5b97add3a50d9",
    LP: "0x6c269dfc142259c52773430b3c78503cc994a93e",
    START_BLOCK_SY: 19516857,
    START_BLOCK: 20158640,
    TREASURY: "0x8270400d528c34e1596ef367eedec99080a1b592",
    EQB_STAKING: "0xb68bba67c943665343d388302aa4c82754d4bd34",
    PENPIE_RECEIPT_TOKEN: "0xeb808b323d8b9f2e2424b83e8a08c5f2633c9254",
    MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",
    LIQUID_LOCKERS: [
        {
            // Penpie
            name: "PenPie",
            address: "0x6e799758cee75dae3d84e09d40dc416ecf713652",
            receiptToken: "0x5ed63a582533ad98bf15bc8669607eea5a61398b",
        },
        {
            // EQB
            name: "EQB",
            address: '0x64627901dadb46ed7f275fd4fc87d086cff1e6e3',
            receiptToken: "0x518ba876c34c688dd7a3d161602973a7705bbff2",
        },
    ]
}