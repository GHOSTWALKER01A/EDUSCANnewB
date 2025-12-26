// import mongoose from 'mongoose'
// import bcrypt from 'bcryptjs'
// import dotenv from 'dotenv'
// import UserModel from './models/auth.model.js'
// import { fileURLToPath } from 'url'

// dotenv.config()

// export const testDatabase = async () => {
//   const ownConnection = mongoose.connection.readyState === 0;
//   if (ownConnection) {
//     await mongoose.connect(process.env.MONGODB_URI as string)
//   }

//   try {
//     const hashedPassword = await bcrypt.hash('password123', 12)

//     const users = [
//     //  { email: 'super@gov.in', username: 'superadmin', password: hashedPassword, role: 'super', isVerified: true },
//       { email: 'mentor@gov.in', username: 'rajkumar', password: hashedPassword, role: 'mentor', isVerified: true },
//       { email: 'mentor@gov.in', username: 'rajkumar01', password: hashedPassword, role: 'mentor', isVerified: true },

//       { email: 'student@gov.in', username: 'amitsharma', password: hashedPassword, role: 'student', isVerified: true },
//       { email: 'student1@gov.in', username: 'niraj', password: hashedPassword, role: 'student', isVerified: true },
//       { email: 'student2@gov.in', username: 'praveen', password: hashedPassword, role: 'student', isVerified: true },
      
     
//     ]

//     await UserModel.deleteMany({})
//     await UserModel.insertMany(users)
//     console.log('Sample users seeded (verified)!')


   
//   } catch (error) {
//     console.error('Error seeding database:', error);
//     throw error;
//   } finally {
//     if (ownConnection) {
//       await mongoose.disconnect()
//     }
//   }
// }

// if (process.argv[1] === fileURLToPath(import.meta.url)) {
//   testDatabase().catch(console.error)
// }