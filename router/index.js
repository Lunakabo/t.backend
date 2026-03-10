const express = require('express');
const router = express.Router({
  mergeParams: true
});

router.get("/", (req, res) => {
  res.json("Hello my love <3")
});

module.exports = router;
