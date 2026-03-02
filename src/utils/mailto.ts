const MAX_MAILTO_EMAILS = 50;

/** Build a mailto: link for a volunteer reminder listing all their claimed locations. */
export function buildReminderMailto(
  email: string,
  locations: { name: string; address: string }[],
  appUrl: string,
): string {
  const subject = locations.length === 1
    ? `Reminder: Poll Dressing for ${locations[0].name}`
    : `Reminder: Complete Your Poll Dressing Assignments`;
  const locationLines = locations.map((l) => `  - ${l.name} (${l.address})`);
  const body = [
    `Hi!`,
    ``,
    `This is a friendly reminder that you claimed the following location${locations.length > 1 ? 's' : ''} for poll dressing:`,
    ``,
    ...locationLines,
    ``,
    `Please place your signs at ${locations.length > 1 ? 'these locations' : 'this location'} before election day. If you're no longer able to dress ${locations.length > 1 ? 'any of them' : 'it'}, please let us know so we can reassign.`,
    ``,
    `You can view the map and manage your claims here:`,
    appUrl,
    ``,
    `Join our Signal group chat for updates and coordination:`,
    `https://signal.group/#CjQKIHhfB6WLSDlvTqFuh65yUP59TvR5oCAx_2N-YKDJCkBYEhDxr0HAooGF_E6BH7OWHgZ2`,
    ``,
    `If you have any questions, reach out to us:`,
    `  Sam Dalton - (214) 686-8608 - spdaltonjr@gmail.com`,
    `  Rob Strobel - (859) 489-8880 - rob@jamestalarico.com`,
    ``,
    `Thank you for volunteering!`,
  ].join('\n');

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Build mailto: link(s) for bulk reminders. Returns multiple links if >50 emails. */
export function buildBulkReminderMailtos(emails: string[], appUrl: string): string[] {
  const subject = 'Reminder: Complete Your Poll Dressing Assignment';
  const body = [
    `Hi!`,
    ``,
    `This is a friendly reminder that you have a claimed poll dressing location that hasn't been dressed yet.`,
    ``,
    `Please place your signs at your claimed location before election day. If you're no longer able to dress your location, please let us know so we can reassign it.`,
    ``,
    `You can view the map and manage your claim here:`,
    appUrl,
    ``,
    `Join our Signal group chat for updates and coordination:`,
    `https://signal.group/#CjQKIHhfB6WLSDlvTqFuh65yUP59TvR5oCAx_2N-YKDJCkBYEhDxr0HAooGF_E6BH7OWHgZ2`,
    ``,
    `If you have any questions, reach out to us:`,
    `  Sam Dalton - (214) 686-8608 - spdaltonjr@gmail.com`,
    `  Rob Strobel - (859) 489-8880 - rob@jamestalarico.com`,
    ``,
    `Thank you for volunteering!`,
  ].join('\n');

  const batches: string[][] = [];
  for (let i = 0; i < emails.length; i += MAX_MAILTO_EMAILS) {
    batches.push(emails.slice(i, i + MAX_MAILTO_EMAILS));
  }

  return batches.map((batch) => {
    const bcc = batch.join(',');
    return `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
