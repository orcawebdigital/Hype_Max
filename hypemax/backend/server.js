require("dotenv").config();
const express=require("express"),cors=require("cors"),mongoose=require("mongoose"),jwt=require("jsonwebtoken"),bcrypt=require("bcryptjs"),multer=require("multer"),cloud=require("cloudinary").v2;
const app=express();app.set("trust proxy",1);app.use(cors({origin:process.env.FRONTEND_ORIGIN||"*"}));app.use(express.json({limit:"1mb"}));
const S=mongoose.Schema,M=(n,d)=>mongoose.model(n,new S(d,{timestamps:true,strict:false}));
const Product=M("Product",{name:String,slug:{type:String,unique:true},price:Number,status:{type:String,default:"draft"},shortDescription:String,description:String,image:String,flavours:[String],ingredients:String,facts:String,serving:String,usage:String,sort:{type:Number,default:0}});
const Review=M("Review",{name:String,text:String,rating:{type:Number,default:5},published:{type:Boolean,default:false}});
const Faq=M("Faq",{q:String,a:String,sort:{type:Number,default:0},published:{type:Boolean,default:true}});
const Setting=M("Setting",{});const Admin=M("Admin",{email:String,hash:String});
const Enquiry=M("Enquiry",{status:{type:String,default:"new"}});
const models={products:Product,reviews:Review,faqs:Faq,enquiries:Enquiry};
const wrap=f=>(q,r)=>Promise.resolve(f(q,r)).catch(e=>r.status(400).json({error:e.message}));
const auth=(q,r,n)=>{try{jwt.verify((q.headers.authorization||"").slice(7),process.env.JWT_SECRET);n()}catch{r.status(401).json({error:"Unauthorised"})}};
app.get("/health",(q,r)=>r.json({ok:1}));
app.get("/api/settings",wrap(async(q,r)=>r.json(await Setting.findOne()||{})));
app.get("/api/products",wrap(async(q,r)=>r.json(await Product.find({status:{$ne:"draft"}}).sort("sort"))));
app.get("/api/products/:slug",wrap(async(q,r)=>{const p=await Product.findOne({slug:q.params.slug,status:{$ne:"draft"}});p?r.json(p):r.status(404).json({error:"Not found"})}));
app.get("/api/reviews",wrap(async(q,r)=>r.json(await Review.find({published:true}).sort("-createdAt"))));
app.get("/api/faqs",wrap(async(q,r)=>r.json(await Faq.find({published:true}).sort("sort"))));
const hits={};
app.post("/api/enquiries",wrap(async(q,r)=>{const n=Date.now();hits[q.ip]=(hits[q.ip]||[]).filter(t=>n-t<36e5);if(hits[q.ip].length>=10)throw Error("Too many requests");hits[q.ip].push(n);const b=q.body,o={};for(const k of["name","phone","email","address","city","state","pin","note","product","flavour"])o[k]=String(b[k]||"").slice(0,300);o.qty=Math.min(99,Math.max(1,+b.qty||1));if(!o.name||!o.phone||!o.address)throw Error("Missing details");await Enquiry.create(o);r.json({ok:1})}));
app.post("/api/login",wrap(async(q,r)=>{const a=await Admin.findOne({email:q.body.email});if(!a||!await bcrypt.compare(q.body.password||"",a.hash))return r.status(401).json({error:"Wrong email or password"});r.json({token:jwt.sign({id:a.id},process.env.JWT_SECRET,{expiresIn:"12h"})})}));
const A=express.Router();A.use(auth);
A.get("/stats",wrap(async(q,r)=>{const c=s=>Product.countDocuments({status:s});const[products,available,coming_soon,draft,out_of_stock,enquiries,newEnquiries,reviews]=await Promise.all([Product.countDocuments(),c("available"),c("coming_soon"),c("draft"),c("out_of_stock"),Enquiry.countDocuments(),Enquiry.countDocuments({status:"new"}),Review.countDocuments({published:true})]);
const act=(await Promise.all(Object.entries({product:[Product,"name"],review:[Review,"name"],faq:[Faq,"q"],enquiry:[Enquiry,"name"]}).map(async([t,[Mo,f]])=>(await Mo.find().sort(k==="faqs"?"sort":"-updatedAt").limit(5)).map(d=>({type:t,title:d.get(f),at:d.updatedAt}))))).flat().sort((a,b)=>b.at-a.at).slice(0,8);
r.json({products,available,coming_soon,draft,out_of_stock,enquiries,newEnquiries,reviews,activity:act})}));
A.put("/settings",wrap(async(q,r)=>r.json(await Setting.findOneAndUpdate({},q.body,{upsert:true,new:true}))));
A.post("/upload",multer({limits:{fileSize:5e6},fileFilter:(q,f,c)=>c(null,/^image\/(png|jpe?g|webp)$/.test(f.mimetype))}).single("file"),wrap((q,r)=>{if(!q.file)throw Error("Upload a PNG/JPG/WEBP under 5MB");cloud.uploader.upload_stream({folder:"hypemax"},(e,x)=>e?r.status(500).json({error:e.message}):r.json({url:x.secure_url})).end(q.file.buffer)}));
for(const[k,Mo]of Object.entries(models)){
 A.get("/"+k,wrap(async(q,r)=>r.json(await Mo.find().sort(k==="faqs"?"sort":"-updatedAt"))));
 A.post("/"+k,wrap(async(q,r)=>r.json(await Mo.create(q.body))));
 A.put("/"+k+"/:id",wrap(async(q,r)=>r.json(await Mo.findByIdAndUpdate(q.params.id,q.body,{new:true}))));
 A.delete("/"+k+"/:id",wrap(async(q,r)=>r.json(await Mo.findByIdAndDelete(q.params.id))));}
app.use("/api/admin",A);
async function seed(){
 if(process.env.ADMIN_EMAIL&&!await Admin.findOne())await Admin.create({email:process.env.ADMIN_EMAIL,hash:await bcrypt.hash(process.env.ADMIN_PASSWORD,10)});
 if(!await Product.countDocuments())await Product.insertMany([
  {name:"Hypemax Pre Workout",slug:"hypemax-pre-workout",status:"available",sort:1,image:"img/product.png",shortDescription:"Energy. Focus. Performance. 30 servings.",flavours:["Fruit"],serving:"30 servings per tub"},
  {name:"Next Hypemax Product",slug:"future-product-02",status:"coming_soon",sort:2,shortDescription:"Something new is being built. Details soon."},
  {name:"Next Hypemax Product",slug:"future-product-03",status:"coming_soon",sort:3,shortDescription:"Something new is being built. Details soon."}]);
 if(!await Faq.countDocuments())await Faq.insertMany([
  {q:"What is HYPEMAX Pre Workout?",a:"A pre-workout supplement from HYPEMAX Nutrition, made for training energy, focus and performance.",sort:1},
  {q:"How can I purchase?",a:"Tap Buy now, choose your quantity, then enter your delivery details. They are sent to our team on WhatsApp, where we confirm your order and payment.",sort:2},
  {q:"Where do you deliver?",a:"Delivery details are shared on WhatsApp when you enquire.",sort:3},
  {q:"How do I contact support?",a:"Email Customercare@hypemaxnutrition.in or WhatsApp 9984472222.",sort:4},
  {q:"What are the ingredients?",a:"See the product page for the ingredient list and supplement facts from the label.",sort:5}]);
 if(!await Setting.countDocuments())await Setting.create({whatsapp:"919984472222",email:"Customercare@hypemaxnutrition.in",phone:"9984472222",heroTitle:"UNLEASH YOUR MAX POTENTIAL.",heroText:"Fuel your ambition. Elevate your performance. Experience the next level of training with HYPEMAX."});
}
mongoose.connect(process.env.MONGODB_URI).then(seed).then(()=>app.listen(process.env.PORT||4000,()=>console.log("API up"))).catch(e=>{console.error(e);process.exit(1)});
