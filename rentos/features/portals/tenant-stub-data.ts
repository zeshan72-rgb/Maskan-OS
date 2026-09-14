/**
 * STUB DATA, NOT WIRED TO THE DATABASE.
 *
 * Two-way messaging has no schema in this project. The 17 recovered
 * migrations create `notifications` (one-way, to a profile) and
 * `communication_logs` (an outbound send record for email, SMS and
 * WhatsApp), but nothing that holds a conversation: no thread, no inbound
 * message, no read state, no reply.
 *
 * The messages screen therefore shows real notifications where they exist,
 * and these fixtures for the conversation itself.
 *
 * TODO: add the migration, then replace the fixture reads with real
 * queries.
 *
 *   conversations   organisation_id, subject, about_table, about_id,
 *                   opened_by, status, last_message_at
 *   messages        conversation_id, sender_profile_id, sender_kind
 *                   ('tenant' | 'staff' | 'system'), body, sent_at,
 *                   read_at, attachment_document_id
 *
 * Two things worth carrying over from the prototype.
 *
 * A message should be attachable to the thing it is about — a maintenance
 * request, an instalment, a renewal offer. A conversation floating free of
 * its subject is how context gets lost between staff.
 *
 * And the tenant's view must show whether staff have read it. A portal that
 * swallows a message with no acknowledgement teaches tenants to phone
 * instead, which defeats the point of having one.
 */

export type MessageSender = "tenant" | "staff" | "system";

export interface StubMessage {
  id: string;
  sender: MessageSender;
  senderName: string;
  body: string;
  sentAt: string;
  readByStaff: boolean;
}

export interface StubThread {
  id: string;
  subject: string;
  about: string | null;
  status: "open" | "answered" | "closed";
  lastMessageAt: string;
  messages: StubMessage[];
}

export const STUB_THREADS: StubThread[] = [
  {
    id: "th-1",
    subject: "Air conditioning in the living room",
    about: "Repair MR-0004",
    status: "answered",
    lastMessageAt: "2026-09-10T09:12:00Z",
    messages: [
      { id: "m-1", sender: "tenant", senderName: "You", readByStaff: true,
        sentAt: "2026-09-08T18:40:00Z",
        body: "The living room AC is blowing warm air. It started yesterday evening." },
      { id: "m-2", sender: "staff", senderName: "Ahmed Khalil", readByStaff: true,
        sentAt: "2026-09-09T08:05:00Z",
        body: "Thanks for letting us know. I have raised it and asked Rashid Cooling to attend." },
      { id: "m-3", sender: "system", senderName: "Maskan", readByStaff: true,
        sentAt: "2026-09-09T08:06:00Z",
        body: "Repair MR-0004 was assigned to Rashid Cooling Services." },
      { id: "m-4", sender: "staff", senderName: "Ahmed Khalil", readByStaff: true,
        sentAt: "2026-09-10T09:12:00Z",
        body: "They can come Thursday between 9 and 12. Does that suit you?" },
    ],
  },
  {
    id: "th-2",
    subject: "Renewing for another year",
    about: "Lease LEASE-0042",
    status: "open",
    lastMessageAt: "2026-09-12T14:22:00Z",
    messages: [
      { id: "m-5", sender: "tenant", senderName: "You", readByStaff: false,
        sentAt: "2026-09-12T14:22:00Z",
        body: "I would like to stay on. Could you send the renewal terms when you have them?" },
    ],
  },
  {
    id: "th-3",
    subject: "Receipt for August rent",
    about: "Payment TRF-42-1",
    status: "closed",
    lastMessageAt: "2026-08-05T11:30:00Z",
    messages: [
      { id: "m-6", sender: "tenant", senderName: "You", readByStaff: true,
        sentAt: "2026-08-04T16:10:00Z",
        body: "Could I get a receipt for August? My employer needs it." },
      { id: "m-7", sender: "staff", senderName: "Mariam Al-Kuwari", readByStaff: true,
        sentAt: "2026-08-05T11:30:00Z",
        body: "Sent to your email, and it is on the Rent page under payments." },
    ],
  },
];
