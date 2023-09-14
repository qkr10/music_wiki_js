const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackConfig = require("./webpack.config.js");
const compiler = webpack(webpackConfig);
const express = require("express");
const port = 3000;
const app = express();
app.use(express.json());

app.get("/", (req, res, next) => {
    next();
});

app.use(
    webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
        stats: { colors: true },
    })
);

app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`서버 구동중 http://localhost:${port}`);
});