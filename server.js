const fs = require("fs");
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");

const app = express();

// MongoDB connection (replace with your Atlas connection string)
mongoose.connect("mongodb+srv://nausheen11begum:N%4011042004@cluster0.bba5fye.mongodb.net/notesDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Create schema for MongoDB
const noteSchema = new mongoose.Schema({
  title: String,
  filePath: String
});

const Note = mongoose.model("Note", noteSchema);

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes

// Home route
app.get("/", (req, res) => {
  res.send("Notes Website Running");
});

// Upload form route
app.get("/upload", (req, res) => {
  res.render("upload");
});
app.get("/notes", async (req, res) => {
  const notes = await Note.find();
  res.render("notes", { notes });
});


// Handle upload
app.post("/upload", upload.single("pdf"), async (req, res) => {
  const { title } = req.body;
  const filePath = req.file.path;

  const newNote = new Note({ title, filePath });
  await newNote.save();

  res.send("File Uploaded Successfully!");
});

app.post("/delete/:id", async (req, res) => {
  const { id } = req.params;

  const note = await Note.findById(id);
  if (note) {
    // Delete file from uploads folder
    fs.unlink(note.filePath, (err) => {
      if (err) console.log("Error deleting file:", err);
      else console.log("File deleted from uploads folder");
    });

    // Delete record from database
    await Note.findByIdAndDelete(id);
  }
  res.redirect("/notes");
});


// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
