import mongoose from 'mongoose';
import ResourceModel from './src/models/Resource.modal.js';

async function main() {
  try {
    await mongoose.connect('mongodb+srv://Eduscan:eduscan@eduscan.qoknifb.mongodb.net', {
      dbName: 'test'
    });
    
    const filter = {};
    const type = 'Academic Material';
    if (type) filter.resourceType = type;
    
    console.log("Filter used:", filter);
    const resources = await ResourceModel.find(filter);
    console.log("Found:", resources.length);
    console.log(resources);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
