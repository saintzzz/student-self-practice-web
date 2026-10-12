export async function bindEngagement(accountId: string): Promise<void> {
  restoreParkedBlob(accountId);
  markOwnerAccountId(accountId);
}
