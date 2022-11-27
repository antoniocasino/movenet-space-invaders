const path = require('path');

module.exports = {
   mode: 'development',
   entry: {
     index: './src/index.js',
   },
   devtool: 'inline-source-map',
  devServer: {
    static: './movenet',
    port: process.env.PORT
  },
  
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'movenet')    
  }   
  
};