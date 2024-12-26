const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Middleware Settings here
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// Middleware Settings here

// Verify Token here
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res
      .status(401)
      .send({ message: "You are not supposed to be here!" });
  }

  jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Access Denied" });
    }
    req.user = decoded;
    next();
  });
};
// Verify Token here

// MongoDB Settings here
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.parzq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Creating Product Collection here
    const queryCollection = client.db("queryProducts").collection("queries");
    const recommendedCollection = client
      .db("recommendedProducts")
      .collection("products");
    // Creating Product Collection here

    // JWT APIS
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_KEY, {
        expiresIn: "24h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // Query related APIS
    app.post("/query", verifyToken, async (req, res) => {
      const newQuery = req.body;
      const result = await queryCollection.insertOne(newQuery);
      res.send(result);
    });

    app.get("/query", async (req, res) => {
      const query = {};
      const cursor = queryCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/updatequery/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.findOne(query);
      res.send(result);
    });

    app.patch("/updatequery/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateQuery = {
        $set: updateData,
        $inc: { recommendationCount: 1 },
      };
      const result = await queryCollection.updateOne(query, updateQuery);
      res.send(result);
    });

    app.delete("/myquery/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/myquery", verifyToken, async (req, res) => {
      const email = req.query.email;
      const emailQuery = { userEmail: email };
      const cursor = queryCollection.find(emailQuery);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/recentqueries", async (req, res) => {
      const recentQuries = await queryCollection
        .find({})
        .limit(6)
        .toArray();
      res.send(recentQuries);
    });
    // Query related APIS

    // Recommended related APIS
    app.post("/products", verifyToken, async (req, res) => {
      const newProduct = req.body;
      const result = await recommendedCollection.insertOne(newProduct);
      res.send(result);
    });

    app.get("/products", verifyToken, async (req, res) => {
      const id = req.query.id;
      const queryId = id ? { queryId: id } : {};
      const result = await recommendedCollection.find(queryId).toArray();
      res.send(result);
    });

    app.get("/products", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { recommenderEmail: email };
      const result = await recommendedCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/products/:id", verifyToken, async (req, res) => {
      const recommendId = req.params.id;
      const recommendQuery = { _id: new ObjectId(recommendId) };
      const result = await recommendedCollection.deleteOne(recommendQuery);
      res.send(result);
    });

    app.patch("/products/:id", verifyToken, async (req, res) => {
      const queryId = req.params.id;
      const productQuery = { _id: new ObjectId(queryId) };
      const updateQuery = {
        $inc: { recommendationCount: -1 },
      };
      const result = await queryCollection.updateOne(productQuery, updateQuery);
      res.send(result);
    });

    app.get("/recommendme", verifyToken, async (req, res) => {
      const email = req.query.email;
      const emailQueries = await queryCollection
        .find({ userEmail: email })
        .toArray();

      const emailQueryIds = emailQueries.map((query) => query._id.toString());

      const getRecommendations = await recommendedCollection
        .find({
          queryId: { $in: emailQueryIds },
        })
        .toArray();

      res.send(getRecommendations);
    });
    // Recommended related APIS
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// MongoDB Settings here

// Get and Listen Settings here
app.get("/", (req, res) => {
  res.send("Product server is running");
});

app.listen(port, () => {
  console.log(`Product server is running on PORT: ${port}`);
});
// Get and Listen Settings here
