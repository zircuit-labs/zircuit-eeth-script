import { EthChainId } from '@sentio/sdk/eth'


export const CONFIG = {
    BLOCKCHAIN: EthChainId.ETHEREUM,
}

export const MISC_CONSTS = {
    ONE_E18: BigInt("1000000000000000000"),
    ONE_DAY_IN_MINUTE: 60 * 24,
    ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
    MULTICALL_BATCH: 256,
    EETH_POINT_RATE: BigInt("1000000000000000000"),
}


export const PENDLE_POOL_ADDRESSES = {
    SY: "0xd7df7e085214743530aff339afc420c7c720bfa7",
    YT: "0x7c2d26182adeef96976035986cf56474fec03bda",
    LP: "0xe26d7f9409581f606242300fbfe63f56789f2169",
    START_BLOCK: 19516857,
    TREASURY: "0x8270400d528c34e1596ef367eedec99080a1b592",
    EQB_STAKING: "0xb68BBA67C943665343D388302AA4c82754d4BD34",
    PENPIE_RECEIPT_TOKEN: "0xEB808B323d8B9f2e2424B83e8a08c5F2633c9254",
    // STAKEDAO_RECEIPT_TOKEN: "0xdd9df6a77b4a4a07875f55ce5cb6b933e52cb30a",
    MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",
    LIQUID_LOCKERS: [
        {
            // Penpie
            address: "0x6e799758cee75dae3d84e09d40dc416ecf713652",
            receiptToken: "0xEB808B323d8B9f2e2424B83e8a08c5F2633c9254",
        },
        {
            // EQB
            address: '0x64627901dadb46ed7f275fd4fc87d086cff1e6e3',
            receiptToken: "0xb68BBA67C943665343D388302AA4c82754d4BD34",
        },
        // {   // STAKEDAO
        //     address: '0xd8fa8dc5adec503acc5e026a98f32ca5c1fa289a',
        //     receiptToken: '0xdd9df6a77b4a4a07875f55ce5cb6b933e52cb30a',
        // }
    ]
}