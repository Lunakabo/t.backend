const express = require('express');
const router = express.Router({
  mergeParams: true
});

router.post("/", (req, res) => {
 const { name } = req.body;
 res.status(200).json(`Welcome ${name}`)
});

module.exports = router;
