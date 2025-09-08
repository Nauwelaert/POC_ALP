const fs = require("fs");

const initializeFolder = (path) => {
  try {
    fs.rmSync(path, { recursive: true });
    console.log(`${path} is deleted!`);
  } catch (err) {
    console.error(`No folder to delete ${path}.`);
  }

  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (err) {
    console.error(`Error while creating ${path}.`);
    console.error(err);
  }
};

paths = ["./deployer/resources", "./srv/dist"];
paths.forEach(initializeFolder);
