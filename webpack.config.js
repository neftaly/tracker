const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const R = require('ramda');

module.exports = (env, { p: isProd } = {}) => ({
  devtool: isProd ? 'source-map' : 'cheap-eval-source-map',
  entry: R.filter(R.identity, [
    !isProd && 'webpack-hot-middleware/client',
    './src/index'
  ]),
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  module: {
    rules: R.filter(R.identity, [
      !isProd && {
        test: /\.jsx?$/,
        loader: 'transform-loader?brfs',
        include: /node_modules/
      },
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loaders: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        loaders: [
          'file-loader?hash=sha512&digest=hex&name=[hash].[ext]'
        ]
      }
    ])
  },
  plugins: R.filter(R.identity, [
    new webpack.ProvidePlugin({
      'React': 'react'
    }),
    new HtmlWebpackPlugin({
      title: 'PR tracker',
      template: 'src/index.ejs'
    }),
    !isProd && new webpack.HotModuleReplacementPlugin(),
    isProd && new webpack.optimize.OccurrenceOrderPlugin()
  ])
});
