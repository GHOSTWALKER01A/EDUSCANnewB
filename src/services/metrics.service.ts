import UserModel from "../models/auth.model.js";
import ClassModel from "../models/Class.model.js";
import AttendanceModel from "../models/Attendance.model.js";
import ChecklistModel from "../models/Checklist.modal.js";
import FeesModel from "../models/Fees.modal.js";
import GradeModel from "../models/Grade.types.js";
import { StudentMetrics, SeriesPoint } from "../types/metrics.types.js";
import { monthKey, monthStart, monthEnd } from "../utils/date.js";
import { Types } from "mongoose";
import {subMonths} from "date-fns"



export async function computeStudentMetrics(studentId: Types.ObjectId | string): Promise<StudentMetrics> {
  const sid = typeof studentId === 'string' ? new Types.ObjectId(studentId) : studentId

  const user = await UserModel.findById(sid).lean()
  if (!user) throw new Error('User not found')

  // --- Attendance overall %
  // Count present records
  const presentCount = await AttendanceModel.countDocuments({ studentId: sid, status: 'present' })

  // For total classes: we count Class documents for student's semester & branch (all time)
  // You can refine to current academic year if you store dates (we could filter by date >= academic year start)
  const classFilter: any = {}
  if (user.semester) classFilter.semester = user.semester
  if (user.branch) classFilter.branch = user.branch

  const totalClasses = await ClassModel.countDocuments(classFilter)
  const attendancePercent = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0

  // --- Academic score: average finalGrade across grades
  const grades = await GradeModel.find({ studentId: sid }).lean()
  const computedFinals = grades.map(g => {
    if (typeof g.finalGrade === 'number') return g.finalGrade
    const mid = g.midSemester ?? 0
    const prac = g.practicals ?? 0
    const sem = g.semesterExam ?? 0
    return mid + prac + sem
  })
  const academicScore = computedFinals.length ? Math.round(computedFinals.reduce((a, b) => a + b, 0) / computedFinals.length) : 0

  // --- Fees coverage
  const fees = await FeesModel.find({ studentId: sid }).lean()
  const totalCharge = fees.reduce((s, f) => s + (f.amount || 0), 0)
  const paidAmount = fees.filter(f => f.paid).reduce((s, f) => s + (f.amount || 0), 0)
  const feeCoveragePercent = totalCharge > 0 ? Math.round((paidAmount / totalCharge) * 100) : 100

  // --- Points (if present on user otherwise derive)
  const points = user.points ?? (presentCount * 1 + (computedFinals.length * 2)) // simple heuristic

  // --- Tips array (generate contextual tips)
  const tips = []
  if (attendancePercent < 75) tips.push({ id: 't-att', text: `Attend next ${Math.max(0, Math.ceil(((0.75 * totalClasses) - presentCount))) } classes to reach 75%` })
  if (feeCoveragePercent < 100) tips.push({ id: 't-fee', text: `You have pending fees—pay ₹${(totalCharge - paidAmount).toLocaleString() || 0} to clear dues` })
  if (academicScore < 50) tips.push({ id: 't-acad', text: 'Focus on weak subjects; book mentor sessions.' })
  if (tips.length === 0) tips.push({ id: 't-ok', text: 'Good job — keep up the momentum!' })

  // --- Risk evaluation
  let risk: 'low' | 'medium' | 'high' = 'low'
  let riskExplanation = 'You are in good standing'
  if (attendancePercent < 60 || academicScore < 40 || feeCoveragePercent < 50) {
    risk = 'high'
    const reasons: string[] = []
    if (attendancePercent < 60) reasons.push(`Low attendance (${attendancePercent}%)`)
    if (academicScore < 40) reasons.push(`Low academic score (${academicScore})`)
    if (feeCoveragePercent < 50) reasons.push(`High unpaid fees (${100 - feeCoveragePercent}% unpaid)`)
    riskExplanation = `Your risk is high because: ${reasons.join(', ')}`
  } else if (attendancePercent < 75 || academicScore < 60 || feeCoveragePercent < 80) {
    risk = 'medium'
    const reasons: string[] = []
    if (attendancePercent < 75) reasons.push(`Attendance is ${attendancePercent}%`)
    if (academicScore < 60) reasons.push(`Academic score ${academicScore}`)
    if (feeCoveragePercent < 80) reasons.push(`Fee coverage ${feeCoveragePercent}%`)
    riskExplanation = `Your risk is medium because: ${reasons.join(', ')}`
  }

  // --- Contribution distribution
  // backlogs estimation: number of grade items below pass threshold (say 40)
  const PASS_THRESHOLD = 40
  const backlogs = grades.filter(g => {
    const final = (typeof g.finalGrade === 'number') ? g.finalGrade : ((g.midSemester ?? 0) + (g.practicals ?? 0) + (g.semesterExam ?? 0))
    return final < PASS_THRESHOLD
  }).length
  const totalSubjects = grades.length || 1
  const backlogsPercent = Math.round((backlogs / totalSubjects) * 100)
  // distribute: normalize attendancePercent, backlogsPercent, feesUnpaidPercent
  const feesUnpaidPercent = 100 - feeCoveragePercent
  // normalize to sum 100
  let raw = [attendancePercent, backlogsPercent, feesUnpaidPercent]
  const rawSum = raw.reduce((a, b) => a + b, 0) || 1
  const contribution: any = {
    attendance: Math.round((attendancePercent / rawSum) * 100),
    backlogs: Math.round((backlogsPercent / rawSum) * 100),
    fees: Math.round((feesUnpaidPercent / rawSum) * 100)
  }

  // --- Checklist (persisted)
  let checklistDoc = await ChecklistModel.findOne({
     studentId: sid 
    }).lean()
  if (!checklistDoc) {
    // create a default checklist
    const defaultItems = [
      { id: 'c-attend', text: `Attend ${Math.max(0, Math.ceil(((0.75 * totalClasses) - presentCount))) } classes`, done: false },
      { id: 'c-pay', text: `Pay pending fees ₹${(totalCharge - paidAmount).toLocaleString()}`, done: feeCoveragePercent === 100 },
    ]
    await ChecklistModel.create({
      studentId: sid,
      items: defaultItems
    })
   
    checklistDoc = { items: defaultItems, studentId: sid } as any
  }
  const checklist = (checklistDoc?.items || []).map((it: any) => ({ id: it.id, text: it.text, done: !!it.done }))

  // --- dueFees list
  const dueFeesRaw = await FeesModel.find({ studentId: sid, paid: false }).sort({ dueDate: 1 }).lean()
  const dueFees = dueFeesRaw.map(f => ({ id: String(f._id), amount: f.amount, dueDate: (f.dueDate ? f.dueDate.toISOString() : ''), description: f.description || '', paid: !!f.paid }))

  // --- attendanceSeries: monthly attendance percent for last 6 months
  const monthsToShow = 6
  const now = new Date()
  const attendanceSeries: SeriesPoint[] = []
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const start = monthStart(subMonths(now, i))
    const end = monthEnd(subMonths(now, i))
    // classes scheduled in that month for student's semester/branch
    const monthClassCount = await ClassModel.countDocuments({
      ...classFilter,
      date: { $gte: start, $lte: end }
    })
    const monthPresent = await AttendanceModel.countDocuments({
      studentId: sid,
      status: 'present',
      createdAt: { $gte: start, $lte: end }
    })
    const value = monthClassCount ? Math.round((monthPresent / monthClassCount) * 100) : 0
    attendanceSeries.push({ date: monthKey(start), value })
  }

  // --- gradesSeries: average per semester
  // group by semester
  const semesterMap = new Map<number, { total: number; count: number }>()
  grades.forEach(g => {
    const sem = g.semester || 0
    const final = typeof g.finalGrade === 'number' ? g.finalGrade :
     ((g.midSemester ?? 0) + (g.practicals ?? 0) + (g.semesterExam ?? 0))
    const cur = semesterMap.get(sem) || { total: 0, count: 0 }
    cur.total += final
    cur.count += 1
    semesterMap.set(sem, cur)
  })
  const gradesSeries: SeriesPoint[] = Array.from(semesterMap.keys()).sort((a, b) => a - b).map(sem => {
    const { total, count } = semesterMap.get(sem)!
    return { date: `Sem ${sem}`, value: count ? Math.round(total / count) : 0 }
  })

  // final payload
  const result: StudentMetrics = {
    attendancePercent,
    academicScore,
    feeCoveragePercent,
    points,
    tips,
    risk,
    riskExplanation,
    contribution,
    checklist,
    dueFees,
    attendanceSeries,
    gradesSeries
  }

  return result
}