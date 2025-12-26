import { app } from './app.js'; 
import connectDB from './db/dbConnect.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import redisClient, { connectRedis } from './services/RedisClient.js'; 
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


config({
  path: resolve(
    __dirname,
     './.env'
  )
})

connectDB()
.then(async() => {
  connectRedis()  
    console.log('Database connected');
     const PORT = process.env.PORT || 4000;

    if (process.env.NODE_ENV === 'development') {
      console.log('Seeding database...');
      // seedDatabase().catch(console.error);
    }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', methods: ['GET', 'POST'] }
})

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id)

 


  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id))
})


app.set('socketio', io);

  httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.io`)
})

app.get('/health', async (req, res) => {
  try {
    await redisClient.ping()
    res.json({
       status: 'OK',
        redis: 'connected',
         socket: io.engine.clientsCount
         })
  } catch {
    res.status(503).json({ status: 'Degraded', redis: 'down' })
  }
})


  })
  .catch((err: any) => {
    console.error('//**MongoDB connection failed:**//', err);
    
    process.exit(1);
  });
