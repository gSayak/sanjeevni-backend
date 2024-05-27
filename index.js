const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3001;
const cors = require('cors');
const User = require('./models/User');
const Session = require('./models/Session');
const DailyUsage = require('./models/DailyUsage');
const connectDB = require('./db');
require('dotenv').config();

const DAILY_LIMIT_IN_SECONDS = process.env.DAILY_LIMIT_IN_SECONDS;

// Connect to MongoDB
connectDB();

app.use(cors());

app.use(bodyParser.json());

app.get('/', (req, res) => {
  console.log('Hello World!');
  res.json({ message: 'Hello World!' });
});

app.post('/log', (req, res) => {
  const { message } = req.body;
  console.log(message);
  res.sendStatus(200);
});

app.get("/call-started", (req, res) => {
  // print call started with current time
  console.log(`Call started at ${new Date().getDate()}/${new Date().getMonth()}/${new Date().getFullYear()} ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`)
  res.status(200).json({ message: "Call started" });
});

app.get("/call-ended", (req, res) => {
  console.log(`Call ended at ${new Date().getDate()}/${new Date().getMonth()}/${new Date().getFullYear()} ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`)
  res.status(200).json({ message: "Call ended" });
});

app.post('/register', async (req, res) => {
  const { email, role } = req.body;
  const existingUser = await User.findOne({
    email
  });
  if (existingUser) {
    console.log('User already exists');
    return res.status(200).json({ message: 'User already exists' });
  }
  const user = await User.create({ email, role });
  console.log('User created', user);
  res.status(201).json(user);
});

app.get('/users', async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});

app.post("/single-user", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json(user);
});

app.post('/start-session', async (req, res) => {
  console.log('start-session');
  console.log(req.body);
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  // check if the daily usage limit is more than 10min or not
  const dailyUsage = await DailyUsage
    .findOne({ email, date: new Date().toISOString().split('T')[0] });

  // this is a temporary solution to check if the user is admin or not
  if (dailyUsage && dailyUsage.totalSessionTimeInSeconds >= DAILY_LIMIT_IN_SECONDS && user.role !== 'admin') {
    return res.status(201).json({ message: 'Daily usage limit exceeded' });
  }

  const startTime = new Date();
  const session = await Session.create({ email, startTime });
  res.status(201).json(session);
});

app.post('/end-session', async (req, res) => {
  console.log('end-session');
  console.log(req.body);
  const { email, sessionId } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const session = await Session.findOne({ _id: sessionId, email });
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }
  if (session.endTime) {
    return res.status(400).json({ message: 'Session already ended' });
  }
  const startTime = new Date(session.startTime);
  const endTime = new Date();

  const diff = (endTime - startTime) / 1000;

  if (diff < 0) {
    return res.status(400).json({ message: 'Invalid end time' });
  }
  // update the total session time in daily usage
  let dailyUsage = await DailyUsage
    .findOne({ email, date: new Date().toISOString().split('T')[0] });

  if (dailyUsage) {
    dailyUsage.totalSessionTimeInSeconds += diff;
    await dailyUsage.save();
  }
  // if daily usage does not exist, create a new one
  if (!dailyUsage) {
    dailyUsage = await DailyUsage.create({
      email,
      date: new Date().toISOString().split('T')[0],
      totalSessionTimeInSeconds: diff
    });
  }
  session.endTime = endTime;
  session.dailyUsageId = dailyUsage._id;
  session.diff = diff;
  await session.save();
  res.status(200).json({"session":session, "dailyUsage":dailyUsage});
});

app.post('/daily-usage', async (req, res) => {
  const { email } = req.body;
  const user = await User
    .findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const dailyUsage = await DailyUsage
    .find({ email });
  res.status(200).json(dailyUsage);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
