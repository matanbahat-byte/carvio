export function linkedOutreachContact<T extends { id: string; linkedApplicationId?: string }>(application: { id: string; linkedContactIds?: string[] }, contacts: T[]): T | undefined {
  for (const id of application.linkedContactIds || []) {
    const contact = contacts.find(item => item.id === id);
    if (contact) return contact;
  }
  const reverseLinks = contacts.filter(item => item.linkedApplicationId === application.id);
  return reverseLinks.length === 1 ? reverseLinks[0] : undefined;
}
