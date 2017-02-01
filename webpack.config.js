'use strict';

const assert = require('assert');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const env = (key) => {
  const ret = process.env[key];
  if (!ret) {
    throw new Error(`required environment variable ${key} is empty`);
  }
  return ret;
};

const relative = (p) => path.resolve(__dirname, p);

const isDev = env('NODE_ENV') === 'development';
const isProd = env('NODE_ENV') === 'production';
assert(isDev || isProd);

const basePlugins = [
  new webpack.DefinePlugin({
    '__DEV__': isDev,
  }),
  new webpack.EnvironmentPlugin(['NODE_ENV']),
  new HtmlWebpackPlugin({
    template: relative('static/index.html'),
    inject: 'body',
  }),
];

const devPlugins = [];

const prodPlugins = [
  // don't need uglifyjs since we're already using the -p flag
];

const plugins = (() => {
  if (isDev) {
    return basePlugins.concat(devPlugins);
  } else if (isProd) {
    return basePlugins.concat(prodPlugins);
  } else {
    assert(false);
  }
})();

module.exports = {
  plugins,

  entry: relative('src/index.tsx'),

  output: {
    path: relative('dist'),
    filename: 'bundle.js',
  },

  devtool: 'source-map',

  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'source-map-loader',
      },
    ],
  },
};
