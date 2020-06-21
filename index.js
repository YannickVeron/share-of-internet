const express = require("express")
const app = express()

const MongoClient = require("mongodb").MongoClient;


const client = new MongoClient("mongodb://localhost:27017", 
    { useNewUrlParser: true, useUnifiedTopology: true });

let db = null;
client.connect(err => {
    db = client.db("Exam")
})

app.use("/js",express.static(__dirname+"/js"))
app.use("/css",express.static(__dirname+"/css"))
app.use(express.json())

app.get("/",function(req,res){
	res.sendFile(__dirname+"/index.html")
})

app.get("/internet",function(req,res){
	db.collection("internet").find({Code:{$nin:[null,"","OWID_WRL"]}}).sort({"Code":1}).toArray(function(err,documents){
		res.json(documents)
	})
})

app.post("/update",function(req,res){
	db.collection("internet").updateOne({Code:req.body.Code, Year:req.body.Year},{ $set: req.body},{upsert:true}).then(
		function(err,doc){
			res.json({update:"ok"})
		}
	)
})

app.listen(1337)