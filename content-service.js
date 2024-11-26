const fs = require("fs");
const path = require("path");

let articles = [];
let categories = [];
let posts = []; // Temporary posts array for added articles during runtime

const articlesPath = path.resolve(__dirname, "./data/articles.json");
const categoriesPath = path.resolve(__dirname, "./data/categories.json");

function getCategoryNameById(categoryId) {
  const category = categories.find(
    (cat) => String(cat.id) === String(categoryId) // Convert both to strings for comparison
  );
  return category ? category.name : "Unknown";
}

module.exports = {
  initialize: function () {
    return new Promise((resolve, reject) => {
      fs.readFile(articlesPath, "utf8", (err, data) => {
        if (err) {
          console.error("Error reading articles file:", err);
          reject(err);
          return;
        }
        articles = JSON.parse(data);
        fs.readFile(categoriesPath, "utf8", (err, data) => {
          if (err) {
            console.error("Error reading categories file:", err);
            reject(err);
            return;
          }
          categories = JSON.parse(data);
          resolve();
        });
      });
    });
  },

  getPublishedArticles: function () {
    return new Promise((resolve, reject) => {
      const publishedArticles = articles
        .filter((article) => article.published === true)
        .map((article) => ({
          ...article,
          categoryName: getCategoryNameById(article.category),
        }));
      publishedArticles.length > 0
        ? resolve(publishedArticles)
        : reject(new Error("No published articles found."));
    });
  },

  getCategories: function () {
    return new Promise((resolve, reject) => {
      categories.length > 0
        ? resolve(categories)
        : reject(new Error("No categories found."));
    });
  },

  addArticle: function (articleData) {
    return new Promise((resolve, reject) => {
      articleData.published = articleData.published ? true : false;

      articleData.postDate = articleData.postDate || new Date().toISOString();
      const maxId =
        articles.length > 0 ? Math.max(...articles.map((a) => a.id)) : 0;
      articleData.id = maxId + 1;
      articles.push(articleData);
      fs.writeFile(articlesPath, JSON.stringify(articles, null, 2), (err) => {
        if (err) {
          console.error("Error writing to articles file:", err);
          reject(err);
          return;
        }
        resolve(articleData);
      });
    });
  },

  getPostsByCategory: function (category) {
    return new Promise((resolve, reject) => {
      const filteredPosts = posts.filter((post) => post.category == category);
      const updatedPosts = filteredPosts.map((post) => ({
        ...post,
        categoryName: getCategoryNameById(post.category),
      }));
      updatedPosts.length > 0
        ? resolve(updatedPosts)
        : reject(new Error("No results returned"));
    });
  },

  getPostById: function (id) {
    return new Promise((resolve, reject) => {
      const post = articles.find((article) => article.id === parseInt(id));
      if (post) {
        resolve({
          ...post,
          categoryName: getCategoryNameById(post.category),
        });
      } else {
        reject(new Error("No result returned"));
      }
    });
  },
};
