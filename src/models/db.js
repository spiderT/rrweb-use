import Dexie from "dexie";

export class RRWEBDB extends Dexie {
  constructor() {
    super("RRWEBDB");
    this.version(1).stores({
      rrwebLists: "++id",
      rrwebItems: "++id, rrwebListId",
    });
  }
}

export const db = new RRWEBDB();

export function resetDatabase() {
  return db.transaction("rw", db.rrwebLists, db.rrwebItems, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}
