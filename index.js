const express = require("express");
const path = require("path");
const contentService = require("./content-service");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const ejsLayouts = require("express-ejs-layouts");

const app = express();
const port = 4000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Set up view engine and use express-ejs-layouts for layouts
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(ejsLayouts);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Initialize content service
contentService
  .initialize()
  .then(() => {
    console.log("Content service initialized");

    // Serve 'about.html' from the root and '/about' routes
    app.get(["/", "/about"], (req, res) => {
      res.render("about", { title: "About Us" });
    });

    // Serve 'home.html' from the '/home' route
    // app.get("/home", (req, res) => {
    //   res.render("home", { title: "Home" });
    // });

    // Assuming you're using a model or direct data fetching
    app.get("/home", (req, res) => {
      contentService
        .getPublishedArticles()
        .then((articles) => {
          res.render("home", {
            title: "Home",
            articles: articles, // Pass the articles to the view
          });
        })
        .catch((err) => {
          console.error("Error fetching published articles:", err);
          res.render("index", {
            title: "Home",
            articles: [], // If error occurs, pass an empty array for articles
          });
        });
    });

    // Route for fetching published articles
    app.get("/articles", (req, res) => {
      contentService
        .getPublishedArticles()
        .then((articles) => {
          res.render("articles", { articles: articles, title: "Articles" });
        })
        .catch((err) => {
          console.error("Error fetching published articles:", err);
          res.render("articles", {
            message: "No articles available or error fetching.",
            articles: [],
            title: "Articles",
          });
        });
    });

    // Route to get categories
    app.get("/categories", (req, res) => {
      contentService
        .getCategories()
        .then((categories) => {
          res.render("categories", {
            categories: categories,
            title: "Categories",
          });
        })
        .catch((err) => {
          console.error("Error fetching categories:", err);
          res.render("categories", {
            message: "No categories available or error fetching.",
            categories: [],
            title: "Categories",
          });
        });
    });

    // Route to display the add post page with categories
    app.get("/articles/add", (req, res) => {
      contentService
        .getCategories()
        .then((categories) => {
          res.render("addArticle", {
            title: "Add Article",
            categories: categories,
          });
        })
        .catch((err) => {
          console.error("Error fetching categories:", err);
          res.render("addArticle", { title: "Add Article", categories: [] });
        });
    });

    // Cloudinary configuration (replace with your credentials)
    cloudinary.config({
      cloud_name: "dnueerhxl",
      api_key: "598345724458537",
      api_secret: "nCFJcou1SdOiIKQiQ96e9h1Gu-Q",
      secure: true,
    });

    const upload = multer(); // No disk storage, image data will be uploaded directly to Cloudinary

    // Route to handle adding new article
    app.post("/articles/add", upload.single("featureImage"), (req, res) => {
      let processArticle = (imageUrl) => {
        // Include the published field (checkbox value)
        const { title, content, category } = req.body;
        const published = req.body.published === "on"; // Checkbox returns "on" if checked

        const newArticle = {
          title,
          content,
          category,
          featureimage: imageUrl,
          published,
        };

        contentService
          .addArticle(newArticle)
          .then((article) => {
            console.log("New article added:", article);

            // Redirect to the articles list
            res.redirect("/articles");
          })
          .catch((err) => {
            console.error("Error adding article:", err);
            res.status(500).send("Internal Server Error");
          });
      };

      if (req.file) {
        let streamUpload = (req) => {
          return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream((error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            });
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });
        };

        streamUpload(req)
          .then((uploaded) => {
            processArticle(uploaded.url);
          })
          .catch((error) => {
            console.error("Image upload error:", error);
            processArticle(""); // Process article without image if upload fails
          });
      } else {
        processArticle(""); // No image provided
      }
    });

    // Route to get all posts or filter by category or minDate
    app.get("/posts", (req, res) => {
      let { category, minDate } = req.query;

      if (category) {
        contentService
          .getPostsByCategory(category)
          .then((posts) =>
            res.render("articles", { articles: posts, title: "Articles" })
          )
          .catch((err) => res.status(400).json({ message: err.message }));
      } else if (minDate) {
        contentService
          .getPostsByMinDate(minDate)
          .then((posts) =>
            res.render("articles", { articles: posts, title: "Articles" })
          )
          .catch((err) => res.status(400).json({ message: err.message }));
      } else {
        contentService
          .getPosts()
          .then((posts) =>
            res.render("articles", { articles: posts, title: "Articles" })
          )
          .catch((err) => res.status(400).json({ message: err.message }));
      }
    });

    // Route to get a post by ID
    app.get("/post/:id", (req, res) => {
      const postId = req.params.id;
      console.log("Fetching post with ID:", postId);

      contentService
        .getPostById(postId)
        .then((post) => {
          res.render("article", { article: post, title: post.title });
        })
        .catch((err) => {
          console.error("Error fetching post:", err);
          res.status(404).render("404", { message: "Post not found" });
        });
    });

    // Handler for favicon requests
    app.get("/favicon.ico", (req, res) => {
      res.status(204).end();
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Express http server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize content service:", err.message);
  });

module.exports = app;
