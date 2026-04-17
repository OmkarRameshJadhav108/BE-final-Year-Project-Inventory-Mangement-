const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/* =========================
   REGISTER USER
========================= */
router.post("/register", async (req, res) => {
    try {
        console.log("REGISTER BODY:", req.body); // ✅ DEBUG

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });

    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/* =========================
   LOGIN USER
========================= */
router.post("/login", async (req, res) => {
    try {
        console.log("LOGIN BODY:", req.body); // ✅ DEBUG

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.log("❌ User not found");
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log("❌ Wrong password");
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "SECRET_KEY",
            { expiresIn: "1d" }
        );

        console.log("✅ Login success");

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
