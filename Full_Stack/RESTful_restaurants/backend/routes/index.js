const express = require("express");
const router = express.Router();
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("../openapi.json");

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/openapi.json", (req, res) => {
  res.json(openApiDocument);
});

router.get("/api-docs", (req, res) => {
  res.redirect("/");
});

router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(openApiDocument, {
  customSiteTitle: "RESTful Restaurants API Documentation",
}));

module.exports = router;
