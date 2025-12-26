import mongoose from "mongoose";


export async function connectDB() : Promise<void> {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        const connection = mongoose.connection

        connection.on('connected', ()=>{
            console.log('MongoDB Connected Successfully')
        })

        connection.on('error', (err: any)=>{
            console.log("MongoDB connection error. Please make sure it is Running. !**" + err)
            process.exit()
        })
        
    } catch (error: any) {
     console.log("Something went wrong !!! ");
       console.log(error)      
    }
}


export default connectDB