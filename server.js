const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const session = require("express-session");
const fs = require('fs');

const PORT = process.env.PORT;
if (!PORT) {
  console.error("PORT environment variable not set");
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not set");
  process.exit(1);
}

const app = express();

// Check uploads directory exists (temporary on Railway)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: true
}));

// Schemas
const noteSchema = new mongoose.Schema({
  title: String,
  filePath: String,
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

// Multer setup
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage: multerStorage });

// ROUTES

app.get("/", (req, res) => {
  res.render("visitor");
});

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
  const filePath = req.file.path;
  const newNote = new Note({ title, filePath, uploaderName: username, uploaderEmail: email });
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
    fs.unlink(note.filePath, (err) => {
      if (err) console.log("Error deleting file:", err);
    });
    await Note.findByIdAndDelete(id);
  }
  res.redirect("/notes");
});

app.get("/login", (req, res) => {
  res.render("login");
});

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

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
