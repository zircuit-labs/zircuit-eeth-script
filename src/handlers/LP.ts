import { AsyncNedb } from "nedb-async";
import {
  PendleMarketContext,
  RedeemRewardsEvent,
  SwapEvent,
  TransferEvent,
  getPendleMarketContractOnContext,
} from "../types/eth/pendlemarket.js";
import { updatePoints } from "../points/point-manager.js";
import { getUnixTimestamp, isLiquidLockerAddress, isSentioInternalError } from "../helper.js";
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES } from "../consts.js";
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20";
import { EthContext } from "@sentio/sdk/eth";
import { getMulticallContractOnContext } from "../types/eth/multicall.js";
import { readAllUserActiveBalances, readAllUserERC20Balances } from "../multicall.js";
import { EVENT_USER_SHARE, POINT_SOURCE_LP } from "../types.js";

/**
 * @dev 1 LP = (X PT + Y SY) where X and Y are defined by market conditions
 * So same as Balancer LPT, we need to update all positions on every swap
 *
 * Users can further deposit LP to liquid lockers to get back receipt tokens.
 * This should also be handled here.
 *
 * Currently for all liquid lockers, 1 receipt token = 1 LP
 */

const db = new AsyncNedb({
  filename: "/data/pendle-accounts-lp.db",
  autoload: true,
});

db.persistence.setAutocompactionInterval(60 * 1000);

type AccountSnapshot = {
  _id: string;
  lastUpdatedAt: number;
  lastImpliedHolding: string;
};

export async function handleLPTransfer(
  evt: TransferEvent,
  ctx: PendleMarketContext
) {
  await processAllLPAccounts(ctx, [
    evt.args.from.toLowerCase(),
    evt.args.to.toLowerCase(),
  ]);
}

export async function handleMarketRedeemReward(
  evt: RedeemRewardsEvent,
  ctx: PendleMarketContext
) {
  await processAllLPAccounts(ctx);
}

export async function handleMarketSwap(_: SwapEvent, ctx: PendleMarketContext) {
  await processAllLPAccounts(ctx);
}

export async function processAllLPAccounts(
  ctx: EthContext,
  addressesToAdd: string[] = []
) {
  // might not need to do this on interval since we are doing it on every swap
  const allAddresses = (await db.asyncFind<AccountSnapshot>({}))
    .map((snapshot) => snapshot._id)

  for (let address of addressesToAdd) {
    address = address.toLowerCase()
    if (!allAddresses.includes(address) && !isLiquidLockerAddress(address)) {
      allAddresses.push(address)
    }
  }
  const marketContract = getPendleMarketContractOnContext(
    ctx,
    PENDLE_POOL_ADDRESSES.LP
  );

  const [allUserShares, totalShare, state] = await Promise.all([
    readAllUserActiveBalances(ctx, allAddresses),
    marketContract.totalActiveSupply(),
    marketContract.readState(marketContract.address),
  ]);

  for (const liquidLocker of PENDLE_POOL_ADDRESSES.LIQUID_LOCKERS) {
    const liquidLockerBal = await marketContract.balanceOf(
      liquidLocker.address
    );
    if (liquidLockerBal == 0n) continue;

    const liquidLockerActiveBal = await marketContract.activeBalance(
      liquidLocker.address
    );
    try {
      const allUserReceiptTokenBalances = await readAllUserERC20Balances(
        ctx,
        allAddresses,
        liquidLocker.receiptToken
      );
      for (let i = 0; i < allAddresses.length; i++) {
        const userBal = allUserReceiptTokenBalances[i];
        const userBoostedHolding =
          (userBal * liquidLockerActiveBal) / liquidLockerBal;
        allUserShares[i] += userBoostedHolding;
      }
    } catch (err) {
      if (isSentioInternalError(err)) {
        throw err;
      }
    }
  }

  const timestamp = getUnixTimestamp(ctx.timestamp);
  for (let i = 0; i < allAddresses.length; i++) {
    const account = allAddresses[i];
    const impliedSy = (allUserShares[i] * state.totalSy) / totalShare;
    await updateAccount(ctx, account, impliedSy, timestamp);
  }
}

async function updateAccount(
  ctx: EthContext,
  account: string,
  impliedSy: bigint,
  timestamp: number
) {
  const snapshot = await db.asyncFindOne<AccountSnapshot>({ _id: account });
  if (snapshot && snapshot.lastUpdatedAt < timestamp) {
    updatePoints(
      ctx,
      POINT_SOURCE_LP,
      account,
      BigInt(snapshot.lastImpliedHolding),
      BigInt(snapshot.lastUpdatedAt),
      BigInt(timestamp),
      timestamp
    );
  }
  const newSnapshot = {
    _id: account,
    lastUpdatedAt: timestamp,
    lastImpliedHolding: impliedSy.toString(),
  };

  ctx.eventLogger.emit(EVENT_USER_SHARE, {
    label: POINT_SOURCE_LP,
    account: account,
    share: impliedSy,
  });

  await db.asyncUpdate({ _id: account }, newSnapshot, { upsert: true });
}