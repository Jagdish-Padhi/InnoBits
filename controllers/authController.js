const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/generateToken");

//Handle user signUp
exports.signUp = async (req, res) => {
  const { username, age, gender, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).send("User already exists!");
    }

    const user = new User({ username, age, gender, email, password });
    await user.save();

    //create token
    const token = generateToken(user);

    //storing token in cookies
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
      sameSite: "None", //for cross-site cookies
    });

    res.redirect("/home");
  } catch (error) {
    res.send("Error" + error.message);
  }
};

//Handle user Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    //checking user exist or not
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("User not found!");
    }

    //comparing password

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).send("invalid password!");
    }

    //creating and storing token
    const token = generateToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: true, // 🔴 Important for HTTPS (Use false for localhost)
      sameSite: "None", // 🔴 Required for cross-site cookies
    });
    res.redirect("/home");
  } catch (error) {
    res.send("Error: " + error.message);
  }
};

//logout handling
exports.logout = (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
};
