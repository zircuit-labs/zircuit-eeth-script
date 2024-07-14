
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES, MULTIPLIER_TIMELINE } from "../consts.js";
import { EthContext } from "@sentio/sdk/eth";
import { LogLevel } from "@sentio/sdk";

import { 
  AccountSnapshotLP,
  RateSnapshotLP,
  RerunSnapshot,
} from "../schema/schema.ts";

import {
  PendleMarketContext,
  RedeemRewardsEvent,
  SwapEvent,
  TransferEvent,
  getPendleMarketContractOnContext,
} from "../types/eth/pendlemarket.js";

import {
  getUnixTimestamp,
  isLiquidLockerOrZeroAddress,
  isSentioInternalError,
  getAllLPSnapshots,
  getAccruedMultiplier,
} from "../helper.js";

import {
  readAllUserActiveBalances,
  readAllUserERC20Balances,
} from "../multicall.js";

import {
  EVENT_USER_SHARE,
  POINT_SOURCE_LP,
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_YT,
} from "../types.js";

const RATE_KEY = `RATES:${POINT_SOURCE_LP}`;
const RERUN_KEY = `RERUN:${POINT_SOURCE_LP}`;

/**
 * @dev This function calculates the cumulative rate to convert LP into equivilent SY
 * This function calculates three different rates:
 * 1. the rate for liquid lockers - penpie
 * 2. TODO: the rate for liquid lockers - EQB
 * 3. TODO: the rate for the Zircuit points (time)
 * and update the three different rates + timestamp to data store
 */
export async function updateLPtoPointRates(ctx: EthContext) {
  let rateSnapshot = await ctx.store.get(RateSnapshotLP, RATE_KEY);
  let timestamp = BigInt(getUnixTimestamp(ctx.timestamp));

  // cuttoff time
  if (timestamp > MISC_CONSTS.CUTOFF_TIME) timestamp = MISC_CONSTS.CUTOFF_TIME;

  if (!rateSnapshot) {
    rateSnapshot = new RateSnapshotLP({
      id: RATE_KEY,
      lastUpdatedAt: timestamp,
      cummulativeRate: BigInt(0),
      cummulativeRatePenPie: BigInt(0),
      cummulativeRateEQB: BigInt(0),
    });
  }

  const marketContract = getPendleMarketContractOnContext(
    ctx,
    PENDLE_POOL_ADDRESSES.LP
  );

  const [totalShare, state] = await Promise.all([
    marketContract.totalActiveSupply(),
    marketContract.readState(marketContract.address),
  ]);

  const accruedMultiplier = getAccruedMultiplier(
    rateSnapshot.lastUpdatedAt,
    timestamp,
    MISC_CONSTS.EETH_POINT_RATE,
    MULTIPLIER_TIMELINE
  );

  for (const liquidLocker of PENDLE_POOL_ADDRESSES.LIQUID_LOCKERS) {
    const liquidLockerBal = await marketContract.balanceOf(
      liquidLocker.address
    );
    if (liquidLockerBal == 0n) continue;

    const liquidLockerActiveBal = await marketContract.activeBalance(
      liquidLocker.address
    );

    if (liquidLocker.name === "PenPie") {
      rateSnapshot.cummulativeRatePenPie +=
        accruedMultiplier * liquidLockerActiveBal * state.totalSy / (liquidLockerBal * totalShare);
    } else if (liquidLocker.name === "EQB") {
      rateSnapshot.cummulativeRateEQB +=
        accruedMultiplier * liquidLockerActiveBal * state.totalSy / (liquidLockerBal * totalShare);
    }
  }

  const cummulativeRate =
    rateSnapshot.cummulativeRate +
    accruedMultiplier * state.totalSy / totalShare;

  rateSnapshot.cummulativeRate = cummulativeRate;
  rateSnapshot.lastUpdatedAt = timestamp;

  await ctx.store.upsert(rateSnapshot);
}

export async function processLPAccounts(
  ctx: EthContext,
  addressesToAdd: string[] = []
) {
  let timestamp = BigInt(getUnixTimestamp(ctx.timestamp));
  let rerunSnapshot = await ctx.store.get(RerunSnapshot, RERUN_KEY);
  let rateSnapshot = await ctx.store.get(RateSnapshotLP, RATE_KEY);

  if(!rerunSnapshot) {
    rerunSnapshot = new RerunSnapshot({
      id: RERUN_KEY,
      ended: false,
      updatedAt: timestamp,
    })
    await ctx.store.upsert(rerunSnapshot);
  }

  if(rerunSnapshot.ended) return;

  if (!rateSnapshot) {
    rateSnapshot = new RateSnapshotLP({
      id: RATE_KEY,
      lastUpdatedAt: timestamp,
      cummulativeRate: BigInt(0),
      cummulativeRatePenPie: BigInt(0),
      cummulativeRateEQB: BigInt(0),
    });
  }
  
  let allAddresses: string[] = [];
  let snapshots: AccountSnapshotLP[] = [];


  if (timestamp > MISC_CONSTS.CUTOFF_TIME) {
    timestamp = MISC_CONSTS.CUTOFF_TIME;
    if (!rerunSnapshot.ended) {
      rerunSnapshot.ended = true;
      rerunSnapshot.updatedAt = timestamp;
      ({ snapshots, addresses: allAddresses } = await getAllLPSnapshots(ctx));
      await ctx.store.upsert(rerunSnapshot);
    }
  }

  if (timestamp > rerunSnapshot.updatedAt + MISC_CONSTS.FULL_EXECUTION_INTERVAL) {
    ({ snapshots, addresses: allAddresses } = await getAllLPSnapshots(ctx));
    rerunSnapshot.updatedAt = timestamp;
    await ctx.store.upsert(rerunSnapshot);
  }

  for (let address of addressesToAdd)
    if (!allAddresses.includes(address) && !isLiquidLockerOrZeroAddress(address)) {
      let accountSnapshot = await ctx.store.get(AccountSnapshotLP, address);
      if (!accountSnapshot) 
        accountSnapshot = new AccountSnapshotLP({
          id: address,
          lastUpdatedAt: BigInt(0),
          lastShare: BigInt(0),
          lastCumulativeRate: BigInt(0),
          lastSharePenPie: BigInt(0),
          lastCummulativeRatePenPie: BigInt(0),
          lastShareEQB: BigInt(0),
          lastCummulativeRateEQB: BigInt(0),
        });
      allAddresses.push(address);
      snapshots.push(accountSnapshot);
    }

  if(allAddresses.length == 0) return;

  let usersSharesPenPie: bigint[] = [];
  let usersSharesEQB: bigint[] = [];

  const usersShares =  await readAllUserActiveBalances(ctx, allAddresses)

  try {
    usersSharesPenPie = await readAllUserERC20Balances(
      ctx,
      allAddresses,
      PENDLE_POOL_ADDRESSES.LIQUID_LOCKERS[0].receiptToken
    )
  } catch(err) {
    if (isSentioInternalError(err)) {
      throw err;
    } 
  }

  try {
    usersSharesEQB = await readAllUserERC20Balances(
      ctx,
      allAddresses,
      PENDLE_POOL_ADDRESSES.LIQUID_LOCKERS[1].receiptToken
    )
  } catch(err) {
    if (isSentioInternalError(err)) {
      throw err;
    }
  }

  const updateAccountPromises = [];

  for (let i = 0; i < allAddresses.length; i++) {
    const address = allAddresses[i];
    let accountSnapshot = snapshots[i];

    // timestamp can be rateSnapshot.lastUpdatedAt since update rates has to always be called first
    const cumulativeRateDiff =
      accountSnapshot.lastShare *
        (rateSnapshot.cummulativeRate - accountSnapshot.lastCumulativeRate) +
      accountSnapshot.lastSharePenPie *
        (rateSnapshot.cummulativeRatePenPie - accountSnapshot.lastCummulativeRatePenPie) +
      accountSnapshot.lastShareEQB *
        (rateSnapshot.cummulativeRateEQB - accountSnapshot.lastCummulativeRateEQB);

    const timeDiff = timestamp - accountSnapshot.lastUpdatedAt;

    accountSnapshot.lastShare = usersShares[i];
    accountSnapshot.lastUpdatedAt = timestamp;
    accountSnapshot.lastCumulativeRate = rateSnapshot.cummulativeRate;
    accountSnapshot.lastCummulativeRateEQB = rateSnapshot.cummulativeRateEQB;
    accountSnapshot.lastCummulativeRatePenPie = rateSnapshot.cummulativeRatePenPie;
    accountSnapshot.lastSharePenPie = usersSharesPenPie.length > 0 ? usersSharesPenPie[i] : BigInt(0);
    accountSnapshot.lastShareEQB = usersSharesEQB.length > 0 ? usersSharesEQB[i] : BigInt(0);

    const accruedPoints =
      cumulativeRateDiff /
      (MISC_CONSTS.ONE_E18 * 3600n);

    updateAccountPromises.push(
      increasePoint(
        ctx,
        POINT_SOURCE_LP,
        address,
        accountSnapshot,
        accruedPoints,
        timeDiff,
        timestamp,
        cumulativeRateDiff
      )
    );
  }
  await Promise.all(updateAccountPromises);
}

async function increasePoint(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  accountSnapshot: AccountSnapshotLP,
  accruedPoints: bigint,
  timeDiff: bigint,
  updatedAt: bigint,
  cumulativeRateDiff: bigint,
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account: account,
    amountEEthHolding: cumulativeRateDiff,
    holdingPeriod: timeDiff,
    zPoint: accruedPoints.scaleDown(18),
    updatedAt,
    severity: LogLevel.INFO,
  });
  await ctx.store.upsert(accountSnapshot);
}