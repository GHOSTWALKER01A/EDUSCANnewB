import mongoose from 'mongoose';

async function main() {
  try {
    await mongoose.connect('mongodb+srv://Eduscan:eduscan@eduscan.qoknifb.mongodb.net', {
      dbName: 'test' // Or whatever the DB name is, usually mongoose connects to default test or eduscan
    });
    
    // Check which DB we're connected to
    console.log("Connected to DB:", mongoose.connection.name);

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    // Get resources
    const db = mongoose.connection.db;
    const resources = await db.collection('resources').find({}).toArray();
    console.log("Resources Dump:", JSON.stringify(resources, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
