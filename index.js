const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

// Middleware Settings here
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }));
app.use(express.json());
app.use(cookieParser());
// Middleware Settings here

// Verify Token here
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if(!token) {
    return res
    .status(401)
    .send({message: "You are not supposed to be here!"})
  }

  jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Access Denied"});
    }
    req.user = decoded;
    next();
  })
}
// Verify Token here

// MongoDB Settings here
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.parzq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Creating Product Collection here
    const productCollection = client.db("queryProducts").collection("products");
    // Creating Product Collection here

    // JWT APIS
    app.post("/jwt", async(req,res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_KEY, {
        expiresIn: "24h",
      })
      res
      .cookie("token", token, {
        httpOnly: true,
        secure: false,
      })
      .send({ success: true });
    })

    app.post("/logout", (req, res) => {
      res
      .clearCookie("token", {
        httpOnly: true,
        secure: false,
      })
      .send({ success: true });
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// MongoDB Settings here

// Get and Listen Settings here
app.get("/", (req, res) => {
    res.send("Product server is running")
})

app.listen(port, () => {
    console.log(`Product server is running on PORT: ${port}`);
})
// Get and Listen Settings here

