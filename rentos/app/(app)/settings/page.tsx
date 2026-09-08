import { Building2, CreditCard, Plug, ToggleLeft, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { OrganisationSettingsForm, InviteMemberDialog, BankAccountDialog } from "@/features/settings/components/settings-forms";
import { getOrganisationSettings } from "@/features/settings/queries";
import { formatDate } from "@/lib/utils/format";
import { APP_CONFIG } from "@/lib/config/app";

export const dynamic = "force-dynamic";

const INTEGRATIONS = [
  {
    key: "payment_provider",
    label: "Online payments",
    description: "Card and wallet payments from the tenant portal.",
    envVars: ["PAYMENT_PROVIDER", "PAYMENT_PROVIDER_API_KEY", "PAYMENT_PROVIDER_WEBHOOK_SECRET"],
  },
  {
    key: "email_provider",
    label: "Transactional email",
    description: "Invitations, receipts, reminders and renewal offers.",
    envVars: ["EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM_ADDRESS"],
  },
  {
    key: "whatsapp",
    label: "WhatsApp Business",
    description: "Rent reminders and maintenance updates over WhatsApp.",
    envVars: ["WHATSAPP_PROVIDER_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  },
];

export default async function SettingsPage() {
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "settings.manage");

  const supabase = await createClient();
  const [settings, { data: roles }] = await Promise.all([
    getOrganisationSettings(membership.organisationId),
    supabase.from("roles").select("id, key, name").is("organisation_id", null).order("name"),
  ]);

  // Integration status is read from the server environment, never from the
  // client — the UI shows only whether a provider is configured, never the key.
  const integrationStatus = {
    payment_provider: !!process.env.PAYMENT_PROVIDER_API_KEY && process.env.PAYMENT_PROVIDER !== "none",
    email_provider: !!process.env.RESEND_API_KEY,
    whatsapp: !!process.env.WHATSAPP_PROVIDER_TOKEN,
  } as Record<string, boolean>;

  const assignableRoles = (roles ?? []).filter((r) => r.key !== "platform_super_admin");

  return (
    <>
      <PageHeader
        title="Settings"
        description={`Configure ${membership.organisationName} — company details, team, payments and integrations.`}
      />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="banking">Bank accounts</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <div className="max-w-2xl">
            {canManage ? (
              <OrganisationSettingsForm organisation={settings.organisation} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-neutral-400" /> Company</CardTitle>
                  <CardDescription>Only administrators can change these details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-neutral-100 text-sm">
                    {[
                      ["Name", settings.organisation.name],
                      ["Legal name", settings.organisation.legal_name ?? "—"],
                      ["Email", settings.organisation.email ?? "—"],
                      ["Phone", settings.organisation.phone ?? "—"],
                      ["Address", settings.organisation.address ?? "—"],
                      ["Currency", settings.organisation.currency],
                      ["Timezone", settings.organisation.timezone],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between py-2">
                        <dt className="text-neutral-500">{label}</dt>
                        <dd className="text-neutral-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Team members</h2>
              <p className="text-xs text-neutral-500">
                Invitations expire after 7 days and can only be used once.
              </p>
            </div>
            {canManage && <InviteMemberDialog roles={assignableRoles} />}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="stagger">
              {settings.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-neutral-900">{member.full_name}</TableCell>
                  <TableCell className="text-neutral-600">{member.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.roles.length === 0 ? (
                        <span className="text-xs text-neutral-400">No role assigned</span>
                      ) : (
                        member.roles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? "success" : "neutral"}>
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {settings.invitations.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">Pending invitations</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="text-neutral-800">{invitation.email}</TableCell>
                      <TableCell className="text-neutral-600">{invitation.role_name}</TableCell>
                      <TableCell className="text-neutral-600">{formatDate(invitation.expires_at)}</TableCell>
                      <TableCell><Badge variant="warning">{invitation.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="banking">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Receiving accounts</h2>
              <p className="text-xs text-neutral-500">
                Shown to tenants when they pay by transfer. Account numbers are masked for roles without finance permissions.
              </p>
            </div>
            {canManage && <BankAccountDialog />}
          </div>

          {settings.bankAccounts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No bank account configured"
              description="Add the account tenants should transfer rent to. It appears on their portal with a payment reference."
              action={canManage ? <BankAccountDialog /> : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account name</TableHead>
                  <TableHead>Account number</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="text-neutral-800">{account.bank_name}</TableCell>
                    <TableCell className="text-neutral-600">{account.account_name}</TableCell>
                    <TableCell className="tabular-nums text-neutral-600">{account.account_number}</TableCell>
                    <TableCell className="tabular-nums text-neutral-600">{account.iban ?? "—"}</TableCell>
                    <TableCell>{account.is_default && <Badge variant="success">Default</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="integrations">
          <div className="stagger space-y-3">
            {INTEGRATIONS.map((integration) => {
              const configured = integrationStatus[integration.key];
              return (
                <Card key={integration.key}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Plug className="h-4 w-4 text-neutral-400" /> {integration.label}
                      </CardTitle>
                      <Badge variant={configured ? "success" : "neutral"}>
                        {configured ? "Configured" : "Not configured"}
                      </Badge>
                    </div>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {configured ? (
                      <p className="text-sm text-emerald-700">
                        Credentials are present on the server. This channel is live.
                      </p>
                    ) : (
                      <div className="space-y-2 text-sm text-neutral-600">
                        <p>
                          This integration is built and ready, but no credentials are set. {APP_CONFIG.name} will
                          not simulate activity for an unconfigured provider.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {integration.envVars.map((v) => (
                            <code key={v} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">{v}</code>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="features">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-neutral-400" /> Feature flags</CardTitle>
              <CardDescription>
                Controls which capabilities are exposed. Platform administrators set the defaults; your plan may
                also gate some of these.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-neutral-100">
                {settings.featureFlags.map((flag) => (
                  <li key={flag.key} className="flex items-center justify-between py-2.5">
                    <span className="text-sm capitalize text-neutral-800">{flag.key.replace(/_/g, " ")}</span>
                    <Badge variant={flag.is_enabled ? "success" : "neutral"}>
                      {flag.is_enabled ? "On" : "Off"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-neutral-400">
        <Users className="h-3 w-3" />
        You are signed in as {ctx.fullName} with {membership.roleKeys.join(", ") || "no"} role
        {membership.roleKeys.length === 1 ? "" : "s"}.
      </p>
    </>
  );
}
