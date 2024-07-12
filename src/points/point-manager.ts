import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES, MULTIPLIER_TIMELINE } from "../consts.js";
import { AccountSnapshotYT, AccountSnapshotSY } from "../schema/schema.ts";

import {
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_YT,
} from "../types.js";
import { getAccruedMultiplier } from "../helper.ts";

export async function updatePointsYT(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEEthHolding: bigint,
  holdingStartTimestamp: bigint,
  holdingEndTimestamp: bigint,
  updatedAt: bigint,
  accountSnapshot: AccountSnapshotYT
) {
  await ctx.store.upsert(accountSnapshot);
  updatePoints(
    ctx,
    label,
    account,
    amountEEthHolding,
    holdingStartTimestamp,
    holdingEndTimestamp,
    updatedAt
  );
}

export async function updatePointsSY(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEEthHolding: bigint,
  holdingStartTimestamp: bigint,
  holdingEndTimestamp: bigint,
  updatedAt: bigint,
  accountSnapshot: AccountSnapshotSY
) {
  await ctx.store.upsert(accountSnapshot);
  updatePoints(
    ctx,
    label,
    account,
    amountEEthHolding,
    holdingStartTimestamp,
    holdingEndTimestamp,
    updatedAt
  );
}

function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEEthHolding: bigint,
  holdingStartTimestamp: bigint,
  holdingEndTimestamp: bigint,
  updatedAt: bigint,
) {
  const holdingPeriod = holdingEndTimestamp - holdingStartTimestamp;

  const zPoint = calcPointsFromHolding(
    amountEEthHolding,
    holdingStartTimestamp,
    holdingEndTimestamp
  );

  if (label == POINT_SOURCE_YT) {
    const zPointTreasuryFee = calcTreasuryFee(zPoint);
    increasePoint(
      ctx,
      label,
      account,
      amountEEthHolding,
      holdingPeriod,
      zPoint - zPointTreasuryFee,
      updatedAt
    );
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      zPointTreasuryFee,
      updatedAt
    );
  } else {
    increasePoint(
      ctx,
      label,
      account,
      amountEEthHolding,
      holdingPeriod,
      zPoint,
      updatedAt
    );
  }
}

function calcPointsFromHolding(
  amountEEthHolding: bigint,
  holdingStartTimestamp: bigint,
  holdingEndTimestamp: bigint
): bigint {
  const cutoffTimestamp = MISC_CONSTS.CUTOFF_TIME;
  if (holdingStartTimestamp >= cutoffTimestamp) return BigInt(0);
  if (holdingEndTimestamp >= cutoffTimestamp)
    holdingEndTimestamp = cutoffTimestamp;

  const accruedMultiplier = getAccruedMultiplier(
    holdingStartTimestamp,
    holdingEndTimestamp,
    MISC_CONSTS.EETH_POINT_RATE,
    MULTIPLIER_TIMELINE
  );

  return amountEEthHolding * 
    accruedMultiplier /
    (MISC_CONSTS.ONE_E18 * 3600n);
}

function increasePoint(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEEthHolding: bigint,
  holdingPeriod: bigint,
  zPoint: bigint,
  updatedAt: bigint
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account,
    amountEEthHolding: amountEEthHolding.scaleDown(18),
    holdingPeriod,
    zPoint: zPoint.scaleDown(18),
    updatedAt,
    severity: LogLevel.INFO,
  });
}

function calcTreasuryFee(amount: bigint): bigint {
  return (amount * 3n) / 100n;
}
