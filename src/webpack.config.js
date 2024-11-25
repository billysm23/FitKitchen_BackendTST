module.exports = {
    mode: 'development',
    watch: true,
    watchOptions: {
      aggregateTimeout: 100
    },
    node: {
      global: true,
      __dirname: true,
    },
    devtool: 'eval',
    entry: ['./app.js'],
    target: 'node',
    module: {
      rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }]
    },
    plugins: [
      new NodemonPlugin(),
      new Dotenv(),
      new CleanWebpackPlugin(['build/*'])
    ],
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'bundle.dev.js'
    },
  };