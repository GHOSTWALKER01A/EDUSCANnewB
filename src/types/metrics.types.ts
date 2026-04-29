
export type Tip ={
    id:string,
    text: string
}

export type DueItem ={
    id:string,
    amount:number,
    dueDate: string,
    description?: string,
    paid?: boolean
    
} 

export type Contribution = {
    attendance: number,
    backlogs: number,
    fees: number
}

export type SeriesPoint = {
     date: string,
      value: number 
    }

export type ChecklistItem = {
     id: string,
      text: string, 
      done: boolean 
    }

export type StudentMetrics = {
  attendancePercent: number,  
  academicScore: number, 
  feeCoveragePercent: number, 
  points: number,
  tips: Tip[],
  risk: 'low' | 'medium' | 'high'
  riskExplanation: string
  contribution: Contribution
  checklist: ChecklistItem[]
  dueFees: DueItem[]
  attendanceSeries: SeriesPoint[]
  gradesSeries: SeriesPoint[]
}