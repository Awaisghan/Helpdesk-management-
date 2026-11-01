import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

const uri=process.env.MONGODB_URI;
const name=process.env.INITIAL_ADMIN_NAME?.trim();
const email=process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.INITIAL_ADMIN_PASSWORD;
if(process.env.NODE_ENV==='production') { console.error('Run this one-time bootstrap from a trusted local environment, never in production.'); process.exit(1); }
if(!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) { console.error('Set a valid MONGODB_URI in your local environment first.'); process.exit(1); }
if(!name || name.length<2 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length<12 || password.length>128) {
  console.error('Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL and a 12–128 character INITIAL_ADMIN_PASSWORD.'); process.exit(1);
}
const userSchema=new mongoose.Schema({name:String,email:{type:String,unique:true,lowercase:true},hashedPassword:{type:String,select:false},role:{type:String,enum:['User','Agent','Admin'],required:true,default:'User'},isActive:{type:Boolean,default:true}},{timestamps:true});
const categorySchema=new mongoose.Schema({name:{type:String,unique:true},description:String,defaultPriority:{type:String,enum:['Low','Medium','High','Urgent']},isActive:{type:Boolean,default:true}},{timestamps:true});
const slaSchema=new mongoose.Schema({priority:{type:String,unique:true},firstResponseHours:Number,resolutionHours:Number},{timestamps:true});
const User=mongoose.models.User??mongoose.model('User',userSchema);
const Category=mongoose.models.Category??mongoose.model('Category',categorySchema);
const SlaRule=mongoose.models.SlaRule??mongoose.model('SlaRule',slaSchema);
try {
  await mongoose.connect(uri,{serverSelectionTimeoutMS:8000,bufferCommands:false});
  if(await User.exists({role:'Admin'})) { console.error('An Admin already exists. Bootstrap stopped without changing any account.'); process.exitCode=1; }
  else if(await User.exists({email})) { console.error('That email already belongs to an account. Bootstrap stopped without promoting it.'); process.exitCode=1; }
  else {
    await User.create({name,email,hashedPassword:await bcrypt.hash(password,12),role:'Admin',isActive:true});
    console.log('Initial Admin created. Sign in with the email and password supplied through your local environment.');
  }
  const legacyCategories=['Account access','Billing','Technical support','General inquiry'];
  await Category.updateMany({name:{$in:legacyCategories}},{$set:{isActive:false}});
  const cats=[['Bug Report','Unexpected behavior, errors, crashes, or broken features.','High'],['Feature Request','Ideas for new capabilities or improvements to the software.','Low'],['Technical Support','Setup, integrations, configuration, and troubleshooting help.','Medium'],['Account & Access','Login, permissions, invitations, and workspace access.','High']];
  for(const [categoryName,description,defaultPriority] of cats) await Category.updateOne({name:categoryName},{$set:{description,defaultPriority,isActive:true},$setOnInsert:{name:categoryName}},{upsert:true});
  const rules=[['Low',24,72],['Medium',8,48],['High',4,24],['Urgent',1,8]];
  for(const [priority,firstResponseHours,resolutionHours] of rules) await SlaRule.updateOne({priority},{$setOnInsert:{priority,firstResponseHours,resolutionHours}},{upsert:true});
  console.log('Four CodxPy software support categories and four default SLA rules are ready. Historical tickets retain their category references.');
} catch(error) { console.error('Database initialization failed:',error instanceof Error?error.message:'Unknown error'); process.exitCode=1; }
finally { await mongoose.disconnect(); }
