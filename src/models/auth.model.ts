import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { IUser } from '../types/auth.types.js'




const UserSchema: Schema<IUser> = new Schema({
  fullname: {
     type: String,
     required: [true, 'Fullname is required'],
     index: true 
    },
  email: { 
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v: string) {
        return /^\w+([\.-]?\w+)*@bitsindri\.ac\.in$/.test(v)
      },
      message: 'Please enter a valid BIT Sindri email address'
    }
     },
  password: { 
    type: String,
    required:[true,'Password is required'],
    
    },
  profilephoto: {
     type: String 
    },
  registrationNo: {
     type: String,
     unique: true,
     sparse: true
     },
  semester: { 
    type: String,
    default: '' 
    },
  phoneNumber: {
     type: String,
     unique: true,
     sparse: true,
     
     },
  subject: { 
    type: String,
    default: ''
     },
  branch: {
     type: String,
     default: ''
     },
  role: { 
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student' 
    },
  join_date: {
     type: Date,
     default: Date.now() 
    },
  verified: { 
    type: Boolean,
    default: false 
    },
  refreshToken: {
     type: String,
     default: '' 
    },
  macAddress: {
     type: String,
     default: '' 
    },
  macHash: {
     type: String,
     default: '' 
    },
}, { timestamps: true })


UserSchema.pre<IUser>('save', async function (this: IUser) {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.isPasswordCorrect = function (password: string) {
  return bcrypt.compare(password, this.password)
}

UserSchema.methods.generateAccessToken = function () {
  const payload = { _id: this._id, role: this.role, email: this.email }
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET as string,
     { expiresIn: process.env.ACCESS_TOKEN_EXPIRY as any })
}

UserSchema.methods.generateRefreshToken = function () {
  const payload = { _id: this._id }
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET as string,
     { expiresIn: process.env.REFRESH_TOKEN_EXPIRY as any })
}

const UserModel = (mongoose.models.User as mongoose.Model<IUser & Document>) ||
 mongoose.model<IUser>('User',UserSchema)

 export default UserModel