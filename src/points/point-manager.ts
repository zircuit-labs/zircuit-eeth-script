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
  holdingStartTimestamp: bigint,
  holdingEndTimestamp: bigint,
): bigint {
  // * eETH exchangeRate
  const pointsMultiplier = (MISC_CONSTS.EETH_POINT_RATE / MISC_CONSTS.ONE_E18) / 3600n;
  let points = amountEEthHolding * (holdingEndTimestamp - holdingStartTimestamp) * 2n * pointsMultiplier;

  const campaignStartTime = BigInt(1713373200) // 4/17 13:00 EST
  const campaignEndTime = BigInt(1714582800) // 5/1 13:00 EST

    if (
      holdingStartTimestamp < campaignStartTime &&
      holdingEndTimestamp >= campaignStartTime    
    ) {
      // start before campaign start, end after campaign start
      const endTime = holdingEndTimestamp < campaignEndTime ? holdingEndTimestamp : campaignEndTime
      points +=
        (endTime - campaignStartTime) *
        amountEEthHolding * 2n * pointsMultiplier
    } else if (
      holdingStartTimestamp >= campaignStartTime &&
      holdingStartTimestamp <= campaignEndTime 
    ) {
      // start after campaign start, and before campaign end
      const endTime = holdingEndTimestamp < campaignEndTime ? holdingEndTimestamp : campaignEndTime
      points +=
        (endTime - holdingStartTimestamp) *
        amountEEthHolding * 2n * pointsMultiplier
    }

  return points
}

export function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEEthHolding: bigint,
  holdingStartTimestamp:bigint,
  holdingEndTimestamp:bigint,
  updatedAt: number
) {
  const zPoint = calcPointsFromHolding(
    amountEEthHolding,
    holdingStartTimestamp,
    holdingEndTimestamp,
  );

  const holdingPeriod = holdingEndTimestamp - holdingStartTimestamp;

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
