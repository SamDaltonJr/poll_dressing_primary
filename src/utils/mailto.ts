import type { CampaignConfig } from '../config/campaigns';

const MAX_MAILTO_EMAILS = 50;

/** Group-chat link, coordinator contacts and sign-off, from campaign config. */
function footerLines(campaign: CampaignConfig): string[] {
  const lines: string[] = [];
  if (campaign.groupChatUrl) {
    lines.push('Join our group chat for updates and coordination:', campaign.groupChatUrl, '');
  }
  if (campaign.contacts?.length) {
    lines.push('If you have any questions, reach out to us:');
    for (const c of campaign.contacts) {
      lines.push(`  ${[c.name, c.phone, c.email].filter(Boolean).join(' - ')}`);
    }
    lines.push('');
  }
  lines.push('Thank you for volunteering!');
  return lines;
}

/** Deep link to the campaign's map (HashRouter), for email bodies. */
export function campaignAppUrl(campaign: CampaignConfig): string {
  return `${window.location.origin}${window.location.pathname}#/c/${campaign.slug}`;
}

/** Build a mailto: link for a volunteer reminder listing all their claimed locations. */
export function buildReminderMailto(
  email: string,
  locations: { name: string; address: string }[],
  campaign: CampaignConfig,
): string {
  const appUrl = campaignAppUrl(campaign);
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
    ...footerLines(campaign),
  ].join('\n');

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Build mailto: link(s) for bulk reminders. Returns multiple links if >50 emails. */
export function buildBulkReminderMailtos(emails: string[], campaign: CampaignConfig): string[] {
  const appUrl = campaignAppUrl(campaign);
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
    ...footerLines(campaign),
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

/** Build mailto: link(s) for a mass email to all volunteers. Body is left mostly empty for the admin to fill in. */
export function buildMassEmailMailtos(emails: string[], campaign: CampaignConfig): string[] {
  const appUrl = campaignAppUrl(campaign);
  const subject = `${campaign.candidateName} Sign Tracker — Volunteer Update`;
  const body = [
    `Hi volunteers!`,
    ``,
    ``,
    ``,
    `You can view the map and manage your claims here:`,
    appUrl,
    ``,
    ...footerLines(campaign),
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
