import React, { useState, useEffect, useMemo } from 'react'
import { dashboardStyles as s } from '../assets/dummyStyles'
import {
  CheckCircle,
  UserRoundCheck,
  Users,
  CalendarRange,
  DollarSign,
  XCircle,
  Search,
} from 'lucide-react'

// use relative API path so dev server proxy or production origin can handle it
const PATIENT_COUNT_API = `/api/appointment/patients/count`

//helper functions
const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeDoctor(doc) {
  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name =
    doc.name ||
    doc.fullName ||
    `${doc.firstName || ""} ${doc.lastName || ""}`.trim() ||
    "Unknown";
  const specialization =
    doc.specialization ||
    doc.speciality ||
    (Array.isArray(doc.specializations)
      ? doc.specializations.join(", ")
      : "") ||
    "General";
  const fee = safeNumber(
    doc.fee ?? doc.fees ?? doc.consultationFee ?? doc.consultation_fee ?? 0,
    0
  );
  const image =
    doc.imageUrl ||
    doc.image ||
    doc.avatar ||
    `https://i.pravatar.cc/150?u=${id}`;

  const appointments = {
    total:
      doc.appointments?.total ??
      doc.totalAppointments ??
      doc.appointmentsTotal ??
      0,
    completed:
      doc.appointments?.completed ??
      doc.completedAppointments ??
      doc.appointmentsCompleted ??
      0,
    canceled:
      doc.appointments?.canceled ??
      doc.canceledAppointments ??
      doc.appointmentsCanceled ??
      0,
  };

  let earnings = null;
  if (doc.earnings !== undefined && doc.earnings !== null)
    earnings = safeNumber(doc.earnings, 0);
  else if (doc.revenue !== undefined && doc.revenue !== null)
    earnings = safeNumber(doc.revenue, 0);
  else if (appointments.completed && fee)
    earnings = fee * safeNumber(appointments.completed, 0);
  else earnings = 0;

  return {
    id,
    name,
    specialization,
    fee,
    image,
    appointments,
    earnings,
    raw: doc,
  };
}

const DashboardPage = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // new patient count 
    const [patientCount, setPatientCount] = useState(null);
    const [loadingPatientCount, setLoadingPatientCount] = useState(false);
    const [query, setQuery] = useState('');
    const [showAll, setShowAll] = useState(false);

    // oad doctors from server side
    useEffect(() => {
    let mounted = true;
    async function loadPatientCount() {
      setLoadingPatientCount(true);
      try {
        const res = await fetch(PATIENT_COUNT_API);
        if (!res.ok) {
          console.warn("Patient count fetch failed:", res.status);
          if (mounted) setPatientCount(0);
          return;
        }

        const body = await res.json().catch(() => ({}));
        const count = Number(
          body?.count ?? body?.totalUsers ?? body?.data ?? 0
        );
        if (mounted) setPatientCount(isNaN(count) ? 0 : count);
      } catch (err) {
        console.error("Failed to fetch patient count:", err);
        if (mounted) setPatientCount(0);
      } finally {
        if (mounted) setLoadingPatientCount(false);
      }
    }
    loadPatientCount();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalDoctors = doctors.length;
    const totalAppointments = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.total, 0),
      0
    );
    const totalEarnings = doctors.reduce(
      (s, d) => s + safeNumber(d.earnings, 0),
      0
    );
    const completed = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.completed, 0),
      0
    );
    const canceled = doctors.reduce(
      (s, d) => s + safeNumber(d.appointments?.canceled, 0),
      0
    );
    const totalLoginPatients =
      doctors.reduce((s, d) => s + (d.raw?.loginPatientsCount ?? 0), 0) || 0;
    return {
      totalDoctors,
      totalAppointments,
      totalEarnings,
      completed,
      canceled,
      totalLoginPatients,
    };
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (!query) return doctors;
    const q = query.trim().toLowerCase();
    const qNum = Number(q);
    return doctors.filter((d) => {
      if (d.name.toLowerCase().includes(q)) return true;
      if ((d.specialization || "").toLowerCase().includes(q)) return true;
      if (d.fee.toString().includes(q)) return true;
      if (!Number.isNaN(qNum) && d.fee <= qNum) return true;
      return false;
    });
  }, [doctors, query]);

  const INITIAL_COUNT = 8;
  const visibleDoctors = showAll
    ? filteredDoctors
    : filteredDoctors.slice(0, INITIAL_COUNT);

  return (
    <div className={s.pageContainer}>
      <div className={s.maxWidthContainer}>
        <div className={s.headerTitle}>
          <div>
            <h1 className={s.headerTitle}>DASHBOARD</h1>
            <p className={s.headerSubtitle}>Welcome to your dashboard</p>
          </div>
        </div>
        {/* stats section */}
        <div className={s.statsGrid}>
          <StatCard
            icon={<Users className='w-6 h-6 text-emerald-600' />}
            label='Total Doctors'
            value={totals.totalDoctors}
          />
          <StatCard
            icon={<UserRoundCheck className='w-6 h-6 text-emerald-600' />}
            label='Total Users Registered'
            value={loadingPatientCount ? 'Loading...' : patientCount ?? totals.totalLoginPatients}
          />
          <StatCard
            icon={<CalendarRange className='w-6 h-6 text-emerald-600' />}
            label='Total Appointments'
            value={totals.totalAppointments}
          />
          <StatCard
            icon={<DollarSign className='w-6 h-6 text-emerald-600' />}
            label='Total Earnings'
            value={`$${totals.totalEarnings.toLocaleString()}`}
          />
          <StatCard
            icon={<CheckCircle className='w-6 h-6 text-emerald-600' />}
            label='Completed'
            value={totals.completed}
          />
          <StatCard
            icon={<XCircle className='w-6 h-6 text-emerald-600' />}
            label='Canceled'
            value={totals.canceled}
          />
        </div>
        <div className='mb-6'>
          <label className = {s.searchLabel}>Search Doctors</label>
          <div className={s.searchContainer}>
            <div className={s.searchInputContainer}>
              <input
                type="text"
                placeholder="Search doctors..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={s.searchInput}
              />
              <Search className={s.searchIcon} />
            </div>
            <div className={s.searchButtons}>
              <button
                onClick={() => {
                  setQuery('');
                  setShowAll(false);
                }}
                className={`${s.clearButton} ${s.cursorPointer}`}
              >
                Clear
              </button>
              
            </div>
          </div>
          <div className={s.tableContainer}>
            <div className={s.tableHeader}>
              <h2 className={s.tableTitle}>Doctors</h2>
              <p className={s.tableCount}>
                {loading ? 'Loading...' : `${visibleDoctors.length} of ${filteredDoctors.length}`}
              </p>
            </div>
            {error && (
            <div className={s.errorContainer}>Error loading Doctors: {error}</div>
            )}
            <div className={s.tableWrapper}>
              <table className={s.table}>
                  <thead className={s.tableHead}>
                <tr>
                  <th className={s.tableHeaderCell}>Doctor</th>
                  <th className={s.tableHeaderCell}>Specialization</th>
                  <th className={s.tableHeaderCell}>Fee</th>
                  <th className={s.tableHeaderCell}>Appointments</th>
                  <th className={s.tableHeaderCell}>Completed</th>
                  <th className={s.tableHeaderCell}>Canceled</th>
                  <th className={s.tableHeaderCell}>Total Earnings</th>
                </tr>
              </thead>
               <tbody className={s.tableBody}>
                {visibleDoctors.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={s.tableRow + " " + 
                      (idx % 2 === 0 ? s.tableRowEven : s.tableRowOdd)}
                  >
                    <td className={s.tableCell + " " + s.tableCellFlex}>
                      <div className={s.verticalLine} />
                      <img
                        src={d.image}
                        alt={d.name}
                        className={s.doctorImage}
                      />
                      <div>
                        <div className={s.doctorName}>
                          {d.name}
                        </div>
                        <div className={s.doctorId}>
                          ID: {d.id}
                        </div>
                      </div>
                    </td>

                    <td className={s.tableCell + " " + s.doctorSpecialization}>
                      {d.specialization}
                    </td>

                    <td className={s.tableCell + " " + s.feeText}>
                      ₹ {d.fee}
                    </td>

                    <td className={s.tableCell + " " + s.appointmentsText}>
                      {d.appointments.total}
                    </td>

                    <td className={s.tableCell + " " + s.completedText}>
                      {d.appointments.completed}
                    </td>

                    <td className={s.tableCell + " " + s.canceledText}>
                      {d.appointments.canceled}
                    </td>

                    <td className={s.tableCell + " " + s.earningsText}>
                      ₹ {d.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className={s.mobileDoctorContainer}>
            <div className={s.mobileDoctorGrid}>
                {visibleDoctors.length > 0 ? (
                  visibleDoctors.map((d) => (
                    <MobileDoctorContainer key={d.id} d={d} />
                  ))
                ) : (
                  <div className={s.emptyState}>No doctors to display.</div>
                )}
              </div>
            </div>
          </div>
          {filteredDoctors.length > INITIAL_COUNT && (
            <div className={s.showMoreContainer}>
              <button className={s.showMoreButtonn + " " + s.cursorPointer} onClick={()=> setShowAll((s) => !s)}>
                {showAll ? 'Show Less' : `Show more (${filteredDoctors.length - INITIAL_COUNT} more)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

function StatCard({ icon, label, value }) {
  return (
    <div className={s.statCard}>
      <div className={s.statCardContainer}>
        <div className={s.statCardIconContainer}>{icon}</div>
        <div className='flex-1'>
          <p className={s.statLabel}>{label}</p>
          <p className={s.statValue}>{value}</p>
        </div>
      </div>
    </div>
  )
}

function MobileDoctorContainer({ d }) {
  return (
    <div className={s.mobileDoctorCard}>
      <div className={s.mobileDoctorHeader}>
        <div className='flex items-center gap-3'>
          <img
            src={d.image}
            alt={d.name}
            className={s.mobileDoctorImage}
          />
          <div>
            <div className={s.mobileDoctorName}>
              {d.name}
            </div>
            <div className={s.mobileDoctorSpecialization}>
              {d.specialization}
            </div>
          </div>
        </div>
        <div className={s.mobileDoctorFee}>${d.fee}</div>
      </div>
      <div className={s.mobileStatsGrid}>
        <div className={s.mobileStatLabel}>Appointments</div>
        <div className={s.mobileStatValue}>{d.appointments.total}</div>
      </div>
      <div className={s.mobileStatsGrid}>
        <div className={s.mobileStatLabel}>Done</div>
        <div className={s.mobileStatValue + " " + s.textEmerald600}>{d.appointments.completed}</div>
      </div>
      <div className={s.mobileStatsGrid}>
        <div className={s.mobileStatLabel}>Canceled</div>
        <div className={s.mobileStatValue + " " + s.textRed600}>{d.appointments.canceled}</div>
      </div>
      <div className={s.mobileEarningsContainer}>
        <div>Earned</div>
        <div className='font-semibold'>$ {d.earnings.toLocaleString()}</div>
      </div>
    </div>
  )
}