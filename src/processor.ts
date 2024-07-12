import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES, CONFIG } from "./consts.ts";
import { PendleYieldTokenProcessor } from "./types/eth/pendleyieldtoken.js";
import { PendleMarketProcessor } from "./types/eth/pendlemarket.js";
import { EQBBaseRewardProcessor } from "./types/eth/eqbbasereward.js";
import { GLOBAL_CONFIG } from "@sentio/runtime";

import { processLPAccounts, updateLPtoPointRates } from "./handlers/LP.js";
import { processSYAccounts } from "./handlers/SY.js";
import { processYTAccounts } from "./handlers/YT.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

PendleMarketProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.LP,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  name: "Pendle Pool LP",
  network: CONFIG.BLOCKCHAIN,
})
  .onEventTransfer(async (evt, ctx) => {
    await updateLPtoPointRates(ctx);
    await processLPAccounts(ctx, [
      evt.args.from.toLowerCase(),
      evt.args.to.toLowerCase(),
    ]);
  })
  .onEventRedeemRewards(async (evt, ctx) => {
    await updateLPtoPointRates(ctx);
  })
  .onEventSwap(async (evt, ctx) => {
    await updateLPtoPointRates(ctx);
  })
  .onTimeInterval(async (_, ctx) => {
    await updateLPtoPointRates(ctx);
    await processLPAccounts(ctx);
  }, MISC_CONSTS.ONE_DAY_IN_MINUTE);

EQBBaseRewardProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.EQB_STAKING,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  name: "Equilibria Base Reward",
  network: CONFIG.BLOCKCHAIN,
})
  .onEventStaked(async (evt, ctx) => {
    await updateLPtoPointRates(ctx);
    await processLPAccounts(ctx, [evt.args._user.toLowerCase()]);
  })
  .onEventWithdrawn(async (evt, ctx) => {
    await updateLPtoPointRates(ctx);
    await processLPAccounts(ctx, [evt.args._user.toLowerCase()]);
  });

ERC20Processor.bind({
  address: PENDLE_POOL_ADDRESSES.PENPIE_RECEIPT_TOKEN,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  name: "Pendle Pie Receipt Token",
  network: CONFIG.BLOCKCHAIN,
}).onEventTransfer(async (evt, ctx) => {
  await updateLPtoPointRates(ctx);
  await processLPAccounts(ctx, [
    evt.args.from.toLowerCase(),
    evt.args.to.toLowerCase(),
  ]);
});

ERC20Processor.bind({
  address: PENDLE_POOL_ADDRESSES.SY,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  endBlock: PENDLE_POOL_ADDRESSES.END_BLOCK,
  name: "Pendle Pool SY",
  network: CONFIG.BLOCKCHAIN,
}).onEventTransfer(async (evt, ctx) => {
  await processSYAccounts(ctx, [
    evt.args.from.toLowerCase(),
    evt.args.to.toLowerCase(),
  ]);
});

PendleYieldTokenProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.YT,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  endBlock: PENDLE_POOL_ADDRESSES.END_BLOCK,
  name: "Pendle Pool YT",
  network: CONFIG.BLOCKCHAIN,
})
  .onEventTransfer(async (evt, ctx) => {
    await processYTAccounts(ctx, [
      evt.args.from.toLowerCase(),
      evt.args.to.toLowerCase(),
    ]);
  })
  .onEventRedeemInterest(async (evt, ctx) => {
    await processYTAccounts(ctx, [evt.args.user.toLowerCase()]);
  })
  .onTimeInterval(async (_, ctx) => {
    await processYTAccounts(ctx);
  }, MISC_CONSTS.ONE_DAY_IN_MINUTE);
