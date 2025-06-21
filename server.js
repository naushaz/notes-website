const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const session = require("express-session");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();

// ✅ Environment variables
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://nausheen11begum:N%4011042004@cluster0.bba5fye.mongodb.net/notesDB?retryWrites=true&w=majority&appName=Cluster0";

// ✅ MongoDB connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Cloudinary Multer Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "notes_uploads",
    allowed_formats: ["pdf"],
    public_id: (req, file) => Date.now() + "-" + file.originalname
  }
});
const upload = multer({ storage: storage });

// ✅ Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(session({
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: true
}));

// ✅ MongoDB Schemas
const noteSchema = new mongoose.Schema({
  title: String,
  filePath: String,  // Will store Cloudinary URL
  uploaderName: String,
  uploaderEmail: String
});
const Note = mongoose.model("Note", noteSchema);

const visitorSchema = new mongoose.Schema({
  username: String,
  email: String,
  visitTime: { type: Date, default: Date.now }
});
const Visitor = mongoose.model("Visitor", visitorSchema);

// ✅ ROUTES

// Visitor entry
app.get("/", (req, res) => { res.render("visitor"); });

app.post("/visitor", async (req, res) => {
  const { username, email } = req.body;
  const newVisitor = new Visitor({ username, email });
  await newVisitor.save();
  req.session.isVisitor = true;
  res.redirect("/home");
});

app.get("/home", (req, res) => {
  if (!req.session.isVisitor) return res.redirect("/");
  res.render("home");
});

app.get("/upload", (req, res) => {
  if (!req.session.isVisitor) return res.redirect("/");
  res.render("upload");
});

app.post("/upload", upload.single("pdf"), async (req, res) => {
  const { title, username, email } = req.body;
  const fileUrl = req.file.path; // Cloudinary gives URL in .path
  const newNote = new Note({ title, filePath: fileUrl, uploaderName: username, uploaderEmail: email });
  await newNote.save();
  res.send("File Uploaded Successfully!");
});

app.get("/notes", async (req, res) => {
  if (!req.session.isVisitor) return res.redirect("/");
  const notes = await Note.find();
  const isAdmin = req.session.isAdmin || false;
  res.render("notes", { notes, isAdmin });
});

app.post("/delete/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.send("Access Denied");
  const { id } = req.params;
  const note = await Note.findById(id);
  if (note) {
    // Delete file from Cloudinary
    const publicId = note.filePath.split("/").pop().split(".")[0]; // Extract public_id from URL
    await cloudinary.uploader.destroy("notes_uploads/" + publicId);
    await Note.findByIdAndDelete(id);
  }
  res.redirect("/notes");
});

app.get("/login", (req, res) => { res.render("login"); });

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "nausheen" && password === "admin123") {
    req.session.isAdmin = true;
    res.redirect("/notes");
  } else {
    res.send("Invalid credentials");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/home");
});

// ✅ Health check route (to keep Railway alive)
app.get("/health", (req, res) => {
  res.send("OK");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
