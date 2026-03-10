const express = require('express');
const router = express.Router({
  mergeParams: true
});

router.get("/", (req, res) => {
    const { name } = req.params;
  res.json(`Welcome ${name}`)
});

module.exports = router;
