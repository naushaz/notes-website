const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

// ✅ Connect to MongoDB
mongoose.connect("mongodb+srv://nausheen11begum:N%4011042004@cluster0.bba5fye.mongodb.net/notesDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


// ✅ Middleware setup
app.use(express.urlencoded({ extended: true })); // to read form data
app.use(express.static(path.join(__dirname, "public"))); // for CSS/images
app.set("view engine", "ejs"); // use EJS
app.set("views", path.join(__dirname, "views")); // set views folder

// ✅ Routes
app.get("/", (req, res) => {
  res.send("Notes Website Running");
});

// ✅ Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
