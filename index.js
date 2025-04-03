const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define exercise Schema
const exerciseSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

// Define user Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

// Define the models
const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);


app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create a new user logic with API POST endpoint
app.post('/api/users', async (req, res) => {
  try {
      const username = req.body.username;
      const newUser = new User({ username: username }); // _id is automatically generated
      const savedUser = await newUser.save();
      res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
      res.status(400).json({ error: err.message }); // Send 400 for bad input
  }
});

// Create a new exercise logic with API POST endpoint
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
      const userId = req.params._id;
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      const description = req.body.description;
      const duration = parseInt(req.body.duration);
      const date = req.body.date ? new Date(req.body.date) : new Date();

      const newExercise = new Exercise({
          user_id: userId,
          description: description,
          duration: duration,
          date: date
      });
      const savedExercise = await newExercise.save();

      res.json({
          _id: user._id, // User's _id
          username: user.username,
          date: savedExercise.date.toDateString(),
          duration: savedExercise.duration,
          description: savedExercise.description
      });
  } catch (err) {
      if (err.kind === 'ObjectId' || err.name === 'CastError') {
          return res.status(400).json({ error: 'Invalid User ID' });
      }
      res.status(400).json({ error: err.message }); // Or 500 for server errors
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
      const userId = req.params._id;
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      const from = req.query.from ? new Date(req.query.from) : null;
      const to = req.query.to ? new Date(req.query.to) : null;
      const limit = req.query.limit ? parseInt(req.query.limit) : null;

      let query = { user_id: userId };
      if (from) query.date = { $gte: from };
      if (to) query.date = { ...query.date, $lte: to };

      let exercises = await Exercise.find(query).limit(limit);

      const log = exercises.map(exercise => ({
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date.toDateString()
      }));

      res.json({
          _id: user._id,
          username: user.username,
          count: exercises.length,
          log: log
      });
  } catch (err) {
      if (err.kind === 'ObjectId' || err.name === 'CastError') {
          return res.status(400).json({ error: 'Invalid User ID' });
      }
      res.status(500).json({ error: err.message });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
