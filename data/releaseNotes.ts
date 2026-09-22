
export interface ChangeLog {
  type: 'new' | 'improvement' | 'fix';
  description: string;
}

export interface ReleaseNote {
  version: string;
  date: string;
  changes: ChangeLog[];
}

export const releaseNotesData: ReleaseNote[] = [
  {
    version: 'v1.9.0',
    date: '2024-11-01',
    changes: [
      { type: 'new', description: "Added a 'Share Intro' button on the call screen to send a pre-configured WhatsApp message." },
      { type: 'new', description: "Introduced a setting to customize the WhatsApp intro message." },
      { type: 'new', description: "Enabled double-clicking the WhatsApp icon in call history to send the intro message instantly." },
      { type: 'improvement', description: "The 'Share Intro' button is now available for all active calls, not just outgoing ones." },
      { type: 'improvement', description: "Replaced the rich-text editor for the intro message with a simpler text area for improved performance." },
    ]
  },
  {
    version: 'v1.8.0',
    date: '2024-10-31',
    changes: [
      { type: 'new', description: "Introduced an 'Unattended Calls' queue for calls that time out without user interaction." },
      { type: 'improvement', description: "'Missed Calls' are now specifically those that are actively ignored before timing out, providing clearer distinction." },
      { type: 'new', description: "Unattended calls are persisted locally and are available across sessions, with an auto-cleanup for entries older than 7 days." },
      { type: 'improvement', description: "The Unattended Calls queue features a distinct amber color scheme and icon to differentiate it from Missed Calls." },
    ]
  },
  {
    version: 'v1.7.0',
    date: '2024-10-30',
    changes: [
      { type: 'improvement', description: "Favorites on the Dial Pad now display the contact's name below their avatar for easier identification." },
      { type: 'improvement', description: 'Adjusted layout of favorites to accommodate names, improving usability.' },
    ],
  },
  {
    version: 'v1.6.0',
    date: '2024-10-29',
    changes: [
      { type: 'new', description: "Enhanced call popups with a context summary from call history, showing the last call's date, duration, and time ago." },
      { type: 'improvement', description: "Context summary is conditionally displayed only if a previous call record exists for the number." },
    ],
  },
  {
    version: 'v1.5.0',
    date: '2024-10-28',
    changes: [
      { type: 'new', description: "Added a 'Message on WhatsApp' feature to initiate chats directly from call popups, history, contacts, search, and the dialer." },
      { type: 'improvement', description: 'Standardized the action icon order in the call history list to: Add to Contacts, WhatsApp, Call.' },
    ],
  },
  {
    version: 'v1.4.0',
    date: '2024-10-27',
    changes: [
      { type: 'new', description: "Added 'What's New' update history in settings to track application changes." },
      { type: 'improvement', description: 'Enhanced UI for release notes with distinct icons for new features, improvements, and fixes.' },
    ],
  },
  {
    version: 'v1.3.1',
    date: '2024-10-26',
    changes: [
      { type: 'new', description: 'Auto-dialer now automatically pauses upon receiving an incoming call.' },
      { type: 'improvement', description: 'Auto-dialer UI now shows a "Paused" status and requires manual resume.' },
      { type: 'fix', description: 'Corrected auto-dialer resume logic to handle cooldowns and in-progress calls accurately.' },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2024-10-25',
    changes: [
      { type: 'new', description: "Added an 'Ignore' button to incoming call popups to dismiss the UI without declining the call." },
      { type: 'new', description: 'A non-intrusive, auto-dismissing banner now appears for ignored calls with a callback option.' },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2024-10-24',
    changes: [
      { type: 'new', description: 'Call popups can now be closed with an \'X\' button or \'Esc\' key without disconnecting the call.' },
      { type: 'improvement', description: 'When a new call arrives during an ongoing call, the active call popup is now automatically hidden to prevent overlap.' },
      { type: 'improvement', description: 'Minimized banners for active and incoming calls allow for easy UI restoration.' },
      { type: 'fix', description: 'Decoupled UI state from call state to prevent accidental disconnections.' },
    ],
  },
  {
    version: 'v1.0.2',
    date: '2024-10-23',
    changes: [
      { type: 'fix', description: 'Resolved an issue where an active incoming call was incorrectly marked as missed if a new call arrived.' },
    ],
  },
];
