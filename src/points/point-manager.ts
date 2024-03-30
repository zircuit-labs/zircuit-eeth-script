import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES } from "../consts.js";
import { EVENT_POINT_INCREASE, POINT_SOURCE, POINT_SOURCE_YT } from "../types.js";

/**
 *
 * @param amountEEthHolding amount of eEth user holds during the period
 * @param holdingPeriod amount of time user holds the eEth
 * @returns Zircuit point
 *
 * @dev to be reviewed by Zircuit team
 */
function calcPointsFromHolding(
  amountEEthHolding: bigint,
  holdingPeriod: bigint
): bigint {
  // * eETH exchangeRate and * 2 for the 2x multiplier
  return amountEEthHolding * MISC_CONSTS.EETH_POINT_RATE / MISC_CONSTS.ONE_E18 * 2n * holdingPeriod / 3600n;
}

export function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEEthHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {
  const zPoint = calcPointsFromHolding(
    amountEEthHolding,
    holdingPeriod
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

function increasePoint(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEEthHolding: bigint,
  holdingPeriod: bigint,
  zPoint: bigint,
  updatedAt: number
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account: account.toLowerCase(),
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
