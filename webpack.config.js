const path = require("path");
//HTML 플러그인
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = {
    mode: "development",
    devtool: "source-map", //크롬에서 디버깅 가능하도록 원본코드같이 bundle
    entry: "./src/MusicEditor.js", //진입점
    output: {
        path: path.resolve(__dirname, "public"), // bundle만들어질 장소
        filename: "MusicEditor.js", // bundle 될 파일 이름
        publicPath: "http://localhost:3000/" //웹팩 미들웨어 장소
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.js$/, //.js 파일 templating
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                },
            },
            {
                test: /\.(sa|sc|c)ss$/, //scss,sass,css templating
                use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/index.html", //html  webpack플러그인을 통해 html 파일도 함께 bundle
        }),
        new MiniCssExtractPlugin({ // style 태그 대신 css 파일도 함께 bundle
            filename: 'style.css',
            chunkFilename: 'style.css',
        }),
    ],
};