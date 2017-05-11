const path = require('path');
const express = require('express');
const webpack = require('webpack');
const dev = require('webpack-dev-middleware');
const hot = require('webpack-hot-middleware');
const config = require('./webpack.config')();

const port = Number(process.env.port || 3000);
const app = express();
const compiler = webpack(config);

app.use(hot(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));

app.use(dev(compiler));

app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'src/index.html'))
);

app.listen(port, 'localhost', err => err
  ? console.log(err)
  : console.log('Listening at http://localhost:' + port)
);
