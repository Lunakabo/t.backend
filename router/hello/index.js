const express = require('express');
const router = express.Router({
  mergeParams: true
});

router.get("/", (req, res) => {
  res.json("Welcome Bro")
});

module.exports = router;
