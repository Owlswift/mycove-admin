'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import {
  AdminUser,
  DonationEntry,
  DuesLedgerEntry,
  LevyPaymentEntry,
  PledgeEntry,
  RESIDENT_TYPE_LABELS,
  ResidentType,
  Role,
} from '@/lib/types';
import { formatMonthKey } from '@/lib/months';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePaginatedList } from '@/lib/use-paginated-list';
import AppShell from '@/components/AppShell';
import { ROLE_LABELS } from '@/components/AppShell';
import Pagination from '@/components/Pagination';

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { dateStyle: 'medium' });
}

/**
 * Regular or commercial — commercial residents pay their own dues rate. The
 * type applies to everything they're billed, past months included, so
 * changing it moves their balance.
 */
function ResidentTypeCard({
  profile,
  onSaved,
}: {
  profile: AdminUser;
  onSaved: (type: ResidentType) => void;
}) {
  const [type, setType] = useState<ResidentType>(profile.residentType ?? 'REGULAR');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await apiFetch<{ residentType: ResidentType }>(`/admin/users/${profile.id}/resident-type`, {
        method: 'PATCH',
        body: JSON.stringify({ residentType: type }),
      });
      onSaved(result.residentType);
      setMessage(`Saved. ${profile.fullName.split(' ')[0]} is now billed at the ${RESIDENT_TYPE_LABELS[result.residentType].toLowerCase()} rate.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save the resident type.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-divider bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-body">Resident type</p>
      <p className="mt-1 text-sm text-body">
        Commercial residents (shops, offices) pay a different monthly dues rate from regular residents. Changing this
        applies to their whole billing history.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as ResidentType);
            setMessage('');
          }}
          aria-label="Resident type"
          className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="REGULAR">Regular</option>
          <option value="COMMERCIAL">Commercial</option>
        </select>
        <button
          type="button"
          onClick={save}
          disabled={saving || type === (profile.residentType ?? 'REGULAR')}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save type'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
    </div>
  );
}

/**
 * The month a resident moved in or began operating. Dues are billed from
 * here, so changing it re-works their balance — including for payments
 * they made before the app.
 */
function MoveInCard({
  profile,
  onSaved,
}: {
  profile: AdminUser;
  onSaved: (moveInMonth: string) => void;
}) {
  const [month, setMonth] = useState(profile.moveInMonth ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await apiFetch<{ moveInMonth: string }>(`/admin/users/${profile.id}/move-in`, {
        method: 'PATCH',
        body: JSON.stringify({ moveInMonth: month }),
      });
      onSaved(result.moveInMonth);
      setMessage(`Saved. Dues for ${profile.fullName.split(' ')[0]} are now billed from ${formatMonthKey(result.moveInMonth)}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save the move-in month.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-divider bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-body">Moved in</p>
      <p className="mt-1 text-sm text-body">
        The month and year this resident moved in or began operating in the estate. Dues are billed from this month.
        {!profile.moveInMonth && (
          <span className="font-medium text-amber-700">
            {' '}
            Not recorded yet, so billing currently counts from the month they joined the app.
          </span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          id="move-in-month"
          type="month"
          value={month}
          max={new Date().toISOString().slice(0, 7)}
          onChange={(e) => {
            setMonth(e.target.value);
            setMessage('');
          }}
          aria-label="Moved in"
          className="rounded-md border border-divider px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !month || month === (profile.moveInMonth ?? '')}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save move-in month'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
    </div>
  );
}

const GRANTABLE_STAFF_ROLES: Role[] = ['CHAIRMAN', 'FINANCE_SECRETARY', 'PROJECT_ADMIN'];

/**
 * Lets an admin also make a resident staff — e.g. the chairman. It's the
 * same account and password: on the mobile app they sign in as a resident,
 * and on this website they pick their staff role in the sign-in dropdown.
 */
function StaffAccessCard({
  profile,
  onSaved,
}: {
  profile: AdminUser;
  onSaved: (staffRoles: Role[]) => void;
}) {
  const [selected, setSelected] = useState<Role[]>(profile.staffRoles ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function toggle(role: Role) {
    setMessage('');
    setSelected((cur) => (cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role]));
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await apiFetch<{ staffRoles: Role[] }>(`/admin/users/${profile.id}/staff-roles`, {
        method: 'PATCH',
        body: JSON.stringify({ staffRoles: selected }),
      });
      onSaved(result.staffRoles);
      setMessage('Saved. Changes apply the next time they sign in.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save staff roles.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-divider bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-body">Staff access</p>
      <p className="mt-1 text-sm text-body">
        Also give {profile.fullName.split(' ')[0]} a role on this website. They keep the same phone number and
        password, and stay a resident on the mobile app.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {GRANTABLE_STAFF_ROLES.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={selected.includes(role)} onChange={() => toggle(role)} />
            {ROLE_LABELS[role]}
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save staff access'}
      </button>
    </div>
  );
}

export default function UserDetailPage() {
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [duesHistory, setDuesHistory] = useState<DuesLedgerEntry[] | null>(null);
  const [levyPayments, setLevyPayments] = useState<LevyPaymentEntry[] | null>(null);
  const [donations, setDonations] = useState<DonationEntry[] | null>(null);
  const [pledges, setPledges] = useState<PledgeEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') return;
    apiFetch<AdminUser>(`/admin/users/${userId}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load user.'));
    void apiFetch<DuesLedgerEntry[]>(`/admin/users/${userId}/dues-history`)
      .then(setDuesHistory)
      .catch(() => setDuesHistory([]));
    void apiFetch<LevyPaymentEntry[]>(`/admin/users/${userId}/levy-payments`)
      .then(setLevyPayments)
      .catch(() => setLevyPayments([]));
    void apiFetch<DonationEntry[]>(`/admin/users/${userId}/donations`)
      .then(setDonations)
      .catch(() => setDonations([]));
    void apiFetch<PledgeEntry[]>(`/admin/users/${userId}/pledges`)
      .then(setPledges)
      .catch(() => setPledges([]));
  }, [currentUser, userId]);

  const duesPage = usePaginatedList(duesHistory ?? []);
  const levyPage = usePaginatedList(levyPayments ?? []);
  const donationsPage = usePaginatedList(donations ?? []);
  const pledgesPage = usePaginatedList(pledges ?? []);

  if (currentUserLoading || !currentUser) {
    return <main className="flex flex-1 items-center justify-center text-body">Loading…</main>;
  }

  const totalDonated = donations?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
  const totalPledged = pledges?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const totalDuesPaid =
    duesHistory?.filter((e) => e.type === 'PAYMENT').reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const totalLeviesPaid = levyPayments?.reduce((sum, p) => sum + p.levy.amount, 0) ?? 0;

  return (
    <AppShell user={currentUser} allow={['ADMIN']}>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover">
            <ArrowLeft size={15} strokeWidth={2} />
            Back to users
          </Link>

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}

          {profile === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}

          {profile && (
            <>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-divider bg-surface p-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-semibold text-title">{profile.fullName}</h2>
                    {!profile.active ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Revoked</span>
                    ) : profile.mustResetPassword ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Awaiting first login
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-body">
                    {[ROLE_LABELS[profile.role], ...(profile.staffRoles ?? []).map((r) => ROLE_LABELS[r])].join(' · ')}
                  </p>
                </div>
                <p className="text-xs text-body">Member since {formatDate(profile.createdAt)}</p>
              </div>

              {profile.role === 'RESIDENT' && (
                <ResidentTypeCard
                  profile={profile}
                  onSaved={(residentType) => setProfile({ ...profile, residentType })}
                />
              )}

              {profile.role === 'RESIDENT' && (
                <MoveInCard
                  profile={profile}
                  onSaved={(moveInMonth) => setProfile({ ...profile, moveInMonth })}
                />
              )}

              {profile.role === 'RESIDENT' && (
                <StaffAccessCard
                  profile={profile}
                  onSaved={(staffRoles) => setProfile({ ...profile, staffRoles })}
                />
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-divider bg-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-body">Contact</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-body">Phone</dt>
                      <dd className="text-text">{profile.phone}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-body">Email</dt>
                      <dd className="text-text">{profile.email ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-body">House</dt>
                      <dd className="text-text">{profile.house ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-body">Vehicle plates</dt>
                      <dd className="text-text">{profile.vehiclePlates.length > 0 ? profile.vehiclePlates.join(', ') : '—'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg border border-divider bg-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-body">Emergency contact</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-body">Name</dt>
                      <dd className="text-text">{profile.emergencyContactName ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-body">Phone</dt>
                      <dd className="text-text">{profile.emergencyContactPhone ?? '—'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Dues paid" value={formatMoney(totalDuesPaid)} />
                <StatCard label="Levies paid" value={formatMoney(totalLeviesPaid)} />
                <StatCard label="Donated" value={formatMoney(totalDonated)} />
                <StatCard label="Pledged" value={formatMoney(totalPledged)} />
              </div>

              <Section title="Dues History">
                {duesHistory === null ? (
                  <p className="mt-3 text-sm text-body">Loading…</p>
                ) : duesHistory.length === 0 ? (
                  <p className="mt-3 text-sm text-body">No dues activity yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-divider bg-surface">
                    <table className="min-w-full divide-y divide-divider text-sm">
                      <thead>
                        <tr className="text-left text-body">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {duesPage.pageItems.map((e) => (
                          <tr key={e.id}>
                            <td className="px-4 py-3 text-body">{e.date}</td>
                            <td className="px-4 py-3 text-title">{e.desc}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  e.type === 'PAYMENT' ? 'bg-green-100 text-green-800' : 'bg-divider text-body'
                                }`}
                              >
                                {e.type === 'PAYMENT' ? 'Payment' : 'Charge'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-body">{formatMoney(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-divider px-4 py-3">
                      <Pagination
                        page={duesPage.page}
                        totalPages={duesPage.totalPages}
                        onPageChange={duesPage.setPage}
                        totalLabel={`${duesHistory.length} entr${duesHistory.length === 1 ? 'y' : 'ies'}`}
                      />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Levy Payments">
                {levyPayments === null ? (
                  <p className="mt-3 text-sm text-body">Loading…</p>
                ) : levyPayments.length === 0 ? (
                  <p className="mt-3 text-sm text-body">No levy payments yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-divider bg-surface">
                    <table className="min-w-full divide-y divide-divider text-sm">
                      <thead>
                        <tr className="text-left text-body">
                          <th className="px-4 py-3 font-medium">Levy</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {levyPage.pageItems.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-3 text-title">{p.levy.label}</td>
                            <td className="px-4 py-3 text-body">{formatMoney(p.levy.amount)}</td>
                            <td className="px-4 py-3 text-body">{formatDateTime(p.paidAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-divider px-4 py-3">
                      <Pagination
                        page={levyPage.page}
                        totalPages={levyPage.totalPages}
                        onPageChange={levyPage.setPage}
                        totalLabel={`${levyPayments.length} payment${levyPayments.length === 1 ? '' : 's'}`}
                      />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Donations">
                {donations === null ? (
                  <p className="mt-3 text-sm text-body">Loading…</p>
                ) : donations.length === 0 ? (
                  <p className="mt-3 text-sm text-body">No donations yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-divider bg-surface">
                    <table className="min-w-full divide-y divide-divider text-sm">
                      <thead>
                        <tr className="text-left text-body">
                          <th className="px-4 py-3 font-medium">Project</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {donationsPage.pageItems.map((d) => (
                          <tr key={d.id}>
                            <td className="px-4 py-3 text-title">{d.project.title}</td>
                            <td className="px-4 py-3 text-accent2-hover">{formatMoney(d.amount)}</td>
                            <td className="px-4 py-3 text-body">{formatDateTime(d.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-divider px-4 py-3">
                      <Pagination
                        page={donationsPage.page}
                        totalPages={donationsPage.totalPages}
                        onPageChange={donationsPage.setPage}
                        totalLabel={`${donations.length} donation${donations.length === 1 ? '' : 's'}`}
                      />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Pledges">
                {pledges === null ? (
                  <p className="mt-3 text-sm text-body">Loading…</p>
                ) : pledges.length === 0 ? (
                  <p className="mt-3 text-sm text-body">No pledges yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-divider bg-surface">
                    <table className="min-w-full divide-y divide-divider text-sm">
                      <thead>
                        <tr className="text-left text-body">
                          <th className="px-4 py-3 font-medium">Project</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Pledged</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {pledgesPage.pageItems.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-3 text-title">{p.project.title}</td>
                            <td className="px-4 py-3 text-body">{formatMoney(p.amount)}</td>
                            <td className="px-4 py-3 text-body">{formatDateTime(p.createdAt)}</td>
                            <td className="px-4 py-3">
                              {p.fulfilledAt ? (
                                <span className="rounded-full bg-accent2-soft px-2 py-0.5 text-xs font-medium text-accent2-hover">
                                  Fulfilled
                                </span>
                              ) : p.remindedAt ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                  Reminded
                                </span>
                              ) : (
                                <span className="rounded-full bg-divider px-2 py-0.5 text-xs font-medium text-body">
                                  Outstanding
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-divider px-4 py-3">
                      <Pagination
                        page={pledgesPage.page}
                        totalPages={pledgesPage.totalPages}
                        onPageChange={pledgesPage.setPage}
                        totalLabel={`${pledges.length} pledge${pledges.length === 1 ? '' : 's'}`}
                      />
                    </div>
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-divider bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-body">{label}</p>
      <p className="mt-1 text-lg font-semibold text-title">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-body">{title}</h3>
      {children}
    </div>
  );
}
