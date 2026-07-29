import React, { useState, useEffect, useRef } from 'react'
import { doctorDetailStyles as s } from '../assets/dummyStyles'
import {
  UserPlus,
  Eye,
  EyeOff,
  CalendarDays,
  Plus,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
} from 'lucide-react'

// helper functions
function timeStringToMinutes(t) {
  if (!t) return 0
  const [hhmm, ampm] = t.split(' ')
  let [h, m] = hhmm.split(':').map(Number)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function formatDateISO(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'June',
    'July',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const day = String(Number(d))
  const month = monthNames[dateObj.getMonth()] || ''
  return `${day} ${month} ${y}`
}

const AddDoctor = () => {
  const [doctorList, setDoctorList] = useState([])
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '',
    specialization: '',
    imageFile: null,
    imagePreview: '',
    experience: '',
    qualifications: '',
    location: '',
    about: '',
    fee: '',
    success: '',
    patients: '',
    rating: '',
    schedule: {},
    availability: 'Available',
    email: '',
    password: '',
  })

  const [slotDate, setSlotDate] = useState('')
  const [slotHour, setSlotHour] = useState('')
  const [slotMinute, setSlotMinute] = useState('00')
  const [slotAmpm, setSlotAmpm] = useState('AM')

  const [toast, setToast] = useState({
    show: false,
    type: 'success',
    message: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [today] = useState(() => {
    const d = new Date()
    const tzOffset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - tzOffset * 60000)
    return local.toISOString().split('T')[0]
  })

  useEffect(() => {
    if (!toast.show) return
    const t = setTimeout(() => setToast((s) => ({ ...s, show: false })), 3000)
    return () => clearTimeout(t)
  }, [toast.show])

  const showToast = (type, message) => setToast({ show: true, type, message })

  function handleImage(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview)
      } catch (err) {}
    }
    setForm((p) => ({
      ...p,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }))
  }

  function removeImage() {
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview)
      } catch (err) {}
    }
    setForm((p) => ({ ...p, imageFile: null, imagePreview: '' }))
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = ''
      } catch (err) {}
    }
  }

  function addSlotToForm() {
    if (!slotDate || !slotHour) {
      showToast('error', 'Select date + time')
      return
    }
    if (slotDate < today) {
      showToast('error', 'Cannot add a slot in the past')
      return
    }
    const time = `${slotHour}:${slotMinute} ${slotAmpm}`

    if (slotDate === today) {
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const slotMinutes = timeStringToMinutes(time)
      if (slotMinutes <= nowMinutes) {
        showToast('error', 'Cannot add a time that has already passed today')
        return
      }
    }

    setForm((f) => {
      const sched = { ...f.schedule }
      if (!sched[slotDate]) sched[slotDate] = []
      if (!sched[slotDate].includes(time)) sched[slotDate].push(time)

      sched[slotDate] = sched[slotDate].sort(
        (a, b) => timeStringToMinutes(a) - timeStringToMinutes(b),
      )
      return { ...f, schedule: sched }
    })

    setSlotHour('')
    setSlotMinute('00')
  }

  function removeSlot(date, time) {
    setForm((f) => {
      const sched = { ...f.schedule }
      sched[date] = sched[date].filter((t) => t !== time)
      if (!sched[date].length) delete sched[date]
      return { ...f, schedule: sched }
    })
  }

  function getFlatSlots(s) {
    const arr = []
    Object.keys(s)
      .sort()
      .forEach((d) => {
        s[d].forEach((t) => arr.push({ date: d, time: t }))
      })
    return arr
  }

  function validate(f) {
    const req = [
      'name',
      'specialization',
      'experience',
      'qualifications',
      'location',
      'about',
      'fee',
      'success',
      'patients',
      'rating',
      'email',
      'password',
    ]

    for (let k of req) if (!f[k]) return false
    if (!f.imageFile) return false
    if (!Object.keys(f.schedule).length) return false
    return true
  }

  // to add doctor
  async function handleAdd(e) {
    e.preventDefault()
    if (!validate(form)) {
      showToast('error', 'Fill all fields + upload image + add slot')
      return
    }
    const r = Number(form.rating)
    if (Number.isNaN(r) || r < 1 || r > 5) {
      showToast('error', 'Rating must be a number between 1 and 5')
      return
    }
    setLoading(true)

    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('specialization', form.specialization || '')
      fd.append('experience', form.experience || '')
      fd.append('qualifications', form.qualifications || '')
      fd.append('location', form.location || '')
      fd.append('about', form.about || '')
      fd.append('fee', form.fee === '' ? '0' : String(form.fee))
      fd.append('success', form.success || '')
      fd.append('patients', form.patients || '')
      fd.append('rating', form.rating === '' ? '0' : String(form.rating))
      fd.append('availability', form.availability || 'Available')
      fd.append('email', form.email)
      fd.append('password', form.password)
      fd.append('schedule', JSON.stringify(form.schedule || {}))

      if (form.imageFile) fd.append('profilePicture', form.imageFile)

      const API_BASE = '/api'

      const res = await fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        body: fd,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status})`
        showToast('error', msg)
        setLoading(false)
        return
      }

      showToast('success', 'Doctor Added Successfully!')

      if (data?.token) {
        try {
          localStorage.setItem('token', data.token)
        } catch (err) {}
      }

      const doctorFromServer = data?.data
        ? data.data
        : { id: Date.now(), ...form, imageUrl: form.imagePreview }

      setDoctorList((old) => [doctorFromServer, ...old])

      // cleanup: revoke object URL if used
      if (form.imagePreview && form.imageFile) {
        try {
          URL.revokeObjectURL(form.imagePreview)
        } catch (err) {}
      }

      setForm({
        name: '',
        specialization: '',
        imageFile: null,
        imagePreview: '',
        experience: '',
        qualifications: '',
        location: '',
        about: '',
        fee: '',
        success: '',
        patients: '',
        rating: '',
        schedule: {},
        availability: 'Available',
        email: '',
        password: '',
      })

      if (fileInputRef.current) {
        try {
          fileInputRef.current.value = ''
        } catch (err) {}
      }

      setSlotDate('')
      setSlotHour('')
      setSlotMinute('00')
      setShowPassword(false)
    } catch (err) {
      console.error('submit error:', err)
      showToast('error', 'Network or server error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.pageContainer}>
      <div className={s.maxWidthContainerLg + ' ' + s.headerContainer}>
        <div className={s.headerFlexContainer}>
          <div className={s.headerIconContainer}>
            <UserPlus className="text-white" size={32} />
          </div>
          <h1 className={s.headerTitle}>Add New Doctor</h1>
        </div>
      </div>

      <div className={s.maxWidthContainer + ' ' + s.formContainer}>
        <form onSubmit={handleAdd} className={s.formGrid}>
          <div className="md:col-span-2">
            <label className={s.label}>Upload Profile Image</label>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                ref={fileInputRef}
                className={s.fileInput}
              />
              {form.imagePreview ? (
                <div className="relative">
                  <img
                    src={form.imagePreview}
                    alt="Preview"
                    className={s.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className={s.removeImageButton}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-emerald-200 bg-emerald-50 text-emerald-500">
                  <Upload size={20} />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={s.label}>Doctor Name</label>
            <input
              className={s.inputBase}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Dr. Jane Doe"
              required
            />
          </div>

          <div>
            <label className={s.label}>Specialization</label>
            <input
              className={s.inputBase}
              value={form.specialization}
              onChange={(e) =>
                setForm((p) => ({ ...p, specialization: e.target.value }))
              }
              placeholder="Cardiology"
              required
            />
          </div>

          <div>
            <label className={s.label}>Experience</label>
            <input
              className={s.inputBase}
              value={form.experience}
              onChange={(e) =>
                setForm((p) => ({ ...p, experience: e.target.value }))
              }
              placeholder="8 years"
              required
            />
          </div>

          <div>
            <label className={s.label}>Qualifications</label>
            <input
              className={s.inputBase}
              value={form.qualifications}
              onChange={(e) =>
                setForm((p) => ({ ...p, qualifications: e.target.value }))
              }
              placeholder="MBBS, MD"
              required
            />
          </div>

          <div>
            <label className={s.label}>Location</label>
            <input
              className={s.inputBase}
              value={form.location}
              onChange={(e) =>
                setForm((p) => ({ ...p, location: e.target.value }))
              }
              placeholder="Kampala"
              required
            />
          </div>

          <div>
            <label className={s.label}>Consultation Fee</label>
            <input
              className={s.inputBase}
              type="number"
              value={form.fee}
              onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
              placeholder="500"
              required
            />
          </div>

          <div>
            <label className={s.label}>Success Rate</label>
            <input
              className={s.inputBase}
              value={form.success}
              onChange={(e) =>
                setForm((p) => ({ ...p, success: e.target.value }))
              }
              placeholder="95%"
              required
            />
          </div>

          <div>
            <label className={s.label}>Patients Served</label>
            <input
              className={s.inputBase}
              value={form.patients}
              onChange={(e) =>
                setForm((p) => ({ ...p, patients: e.target.value }))
              }
              placeholder="1200"
              required
            />
          </div>

          <div>
            <label className={s.label}>Rating</label>
            <input
              className={s.inputBase}
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(e) =>
                setForm((p) => ({ ...p, rating: e.target.value }))
              }
              placeholder="4.8"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={s.label}>About</label>
            <textarea
              className={s.textareaBase + ' min-h-[120px]'}
              value={form.about}
              onChange={(e) =>
                setForm((p) => ({ ...p, about: e.target.value }))
              }
              placeholder="Brief biography"
              required
            />
          </div>

          <div>
            <label className={s.label}>Email</label>
            <input
              className={s.inputBase}
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="doctor@example.com"
              required
            />
          </div>

          <div>
            <label className={s.label}>Password</label>
            <div className="relative">
              <input
                className={s.inputBase + ' pr-12'}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Create password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className={s.scheduleContainer}>
              <div className={s.scheduleHeader}>
                <CalendarDays className="text-emerald-600" size={20} />
                <h2 className={s.scheduleTitle}>Doctor Schedule</h2>
              </div>
              <div className={s.scheduleInputsContainer}>
                <input
                  type="date"
                  min={today}
                  className={s.scheduleDateInput}
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                />
                <select
                  className={s.scheduleTimeSelect}
                  value={slotHour}
                  onChange={(e) => setSlotHour(e.target.value)}
                >
                  <option value="">Hour</option>
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((h) => (
                    <option key={h} value={String(h).padStart(2, '0')}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  className={s.scheduleTimeSelect}
                  value={slotMinute}
                  onChange={(e) => setSlotMinute(e.target.value)}
                >
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </select>
                <select
                  className={s.scheduleTimeSelect}
                  value={slotAmpm}
                  onChange={(e) => setSlotAmpm(e.target.value)}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
                <button
                  type="button"
                  onClick={addSlotToForm}
                  className={s.addSlotButton}
                >
                  <Plus size={18} /> Add Slot
                </button>
              </div>

              <div className={s.slotsGrid}>
                {getFlatSlots(form.schedule).map(({ date, time }) => (
                  <div key={`${date}-${time}`} className={s.slotItem}>
                    <span>
                      {formatDateISO(date)} • {time}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSlot(date, time)}
                      className="text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={s.submitButtonContainer}>
            <button
              type="submit"
              disabled={loading}
              className={`${s.submitButton} ${
                loading ? s.submitButtonDisabled : s.submitButtonEnabled
              }`}
            >
              {loading ? 'Adding Doctor...' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </div>

      {/* Doctor list overview */}
      <div className={s.doctorListContainer}>
        {doctorList.length ? (
          <div className={s.doctorListGrid}>
            {doctorList.map((d) => (
              <div key={d.id || d._id} className={s.doctorCard}>
                <div className={s.doctorCardContainer}>
                  <img
                    src={d.imageUrl || d.imagePreview}
                    alt={d.name}
                    className={s.doctorImage}
                  />
                  <div>
                    <div className={s.doctorName}>{d.name}</div>
                    <div className={s.doctorSpecialization}>
                      {d.specialization}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={s.emptyState}>No Doctor Yet</p>
        )}
      </div>

      {/* TOAST */}
      {toast.show && (
        <div
          className={
            s.toastContainer +
            ' ' +
            (toast.type === 'success' ? s.toastSuccess : s.toastError)
          }
        >
          {toast.type === 'success' ? (
            <CheckCircle size={22} />
          ) : (
            <XCircle size={22} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default AddDoctor