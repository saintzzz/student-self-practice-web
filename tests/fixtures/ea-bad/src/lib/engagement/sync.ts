export async function bindEngagement(accountId: string): Promise<void> {
  markOwnerAccountId(accountId);
}
