import { AsyncNedb } from "nedb-async";
import { TransferEvent } from "../types/eth/pendlemarket.js";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import { getUnixTimestamp, isPendleAddress } from "../helper.js";
import { updatePoints } from "../points/point-manager.js";
import { EVENT_USER_SHARE, POINT_SOURCE_SY } from "../types.js";

/**
 * @dev 1 SY EETH = 1 EETH
 */

const db = new AsyncNedb({
  filename: "/data/pendle-accounts-sy.db",
  autoload: true,
});

db.persistence.setAutocompactionInterval(60 * 1000);


type AccountSnapshot = {
  _id: string;
  lastUpdatedAt: number;
  lastBalance: string;
};

export async function handleSYTransfer(evt: TransferEvent, ctx: ERC20Context) {
  await processAccount(evt.args.from, ctx);
  await processAccount(evt.args.to, ctx);
}

export async function processAllAccounts(ctx: ERC20Context) {
  const accountSnapshots = await db.asyncFind<AccountSnapshot>({});
  await Promise.all(
    accountSnapshots.map((snapshot) => processAccount(snapshot._id, ctx))
  );
}

async function processAccount(account: string, ctx: ERC20Context) {
  if (isPendleAddress(account)) return;
  const timestamp = getUnixTimestamp(ctx.timestamp);

  const snapshot = await db.asyncFindOne<AccountSnapshot>({ _id: account });
  if (snapshot && snapshot.lastUpdatedAt < timestamp) {
    updatePoints(
      ctx,
      POINT_SOURCE_SY,
      account,
      BigInt(snapshot.lastBalance),
      BigInt(snapshot.lastUpdatedAt),
      BigInt(timestamp),
      timestamp
    );
  }

  const newBalance = await ctx.contract.balanceOf(account);

  const newSnapshot = {
    _id: account,
    lastUpdatedAt: timestamp,
    lastBalance: newBalance.toString(),
  };

  ctx.eventLogger.emit(EVENT_USER_SHARE, {
    label: POINT_SOURCE_SY,
    account,
    share: newBalance,
  })

  await db.asyncUpdate({ _id: account }, newSnapshot, { upsert: true });
}
