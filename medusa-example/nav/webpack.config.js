const HtmlWebpackPlugin = require("html-webpack-plugin");
const DashboardPlugin = require("@module-federation/dashboard-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");
const { readFileSync } = require("fs");

const env = readFileSync(__dirname + "/../.env")
  .toString("utf-8")
  .split("\n")
  .map((v) => v.trim().split("="));

if(!process.env.DASHBOARD_WRITE_TOKEN) {
  process.env.DASHBOARD_WRITE_TOKEN = env.find(
    ([k]) => k === "DASHBOARD_WRITE_TOKEN"
  )[1];
}

if(!process.env.DASHBOARD_READ_TOKEN) {
  process.env.DASHBOARD_READ_TOKEN = env.find(
    ([k]) => k === "DASHBOARD_READ_TOKEN"
  )[1];
}

process.env.DASHBOARD_BASE_URL = env.find(
  ([k]) => k === "DASHBOARD_BASE_URL"
)[1] || 'https://api.medusa.codes'

module.exports = {
  entry: "./src/index",
  mode: "development",
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    port: 3003,
  },
  output: {
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].js",
    publicPath: `auto`,
  },
  cache: false,
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
          {
            loader: "less-loader",
            options: {
              lessOptions: {
                javascriptEnabled: true,
                math: "always",
              },
            },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        loader: "esbuild-loader",
        exclude: /node_modules/,
        options: {
          loader: "jsx",
          target: "es2015",
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "nav__REMOTE_VERSION__",
      library: { type: "var", name: "nav__REMOTE_VERSION__" },
      filename: "remoteEntry.js",
      remotes: {
        dsl: DashboardPlugin.clientVersion({
          currentHost: "nav",
          remoteName: "dsl",
          dashboardURL: `${process.env.DASHBOARD_BASE_URL}/get-remote?token=${process.env.DASHBOARD_READ_TOKEN}`,
        }),
        search: DashboardPlugin.clientVersion({
          currentHost: "nav",
          remoteName: "search",
          dashboardURL: `${process.env.DASHBOARD_BASE_URL}/get-remote?token=${process.env.DASHBOARD_READ_TOKEN}`,
        }),
        utils: DashboardPlugin.clientVersion({
          currentHost: "nav",
          remoteName: "utils",
          dashboardURL: `${process.env.DASHBOARD_BASE_URL}/get-remote?token=${process.env.DASHBOARD_READ_TOKEN}`,
        }),
      },
      exposes: {
        "./Header": "./src/Header",
        "./Footer": "./src/Footer",
      },
      // sharing code based on the installed version, to allow for multiple vendors with different versions
      shared: require("./package.json").dependencies,
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new DashboardPlugin({
      versionStrategy: `${Date.now()}`,
      filename: "dashboard.json",
      environment: process.env.VERCEL ? 'production' : 'development',
      dashboardURL: `${process.env.DASHBOARD_BASE_URL}/update?token=${process.env.DASHBOARD_WRITE_TOKEN}`,
      versionChangeWebhook: "http://cnn.com/",
      metadata: {
        baseUrl: process.env.VERCEL_URL ? process.env.VERCEL_URL : "http://localhost:3003",
        source: {
          url: "https://github.com/module-federation/federation-dashboard/tree/master/dashboard-example/nav",
        },
        remote: "http://localhost:3003/remoteEntry.js",
      },
    }),
  ],
};
